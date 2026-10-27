import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { Solception } from "../target/types/solception";

const METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

describe("solception", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Solception as Program<Solception>;
  const conn = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  const treasury = Keypair.generate();
  const padOwner = Keypair.generate();
  const padFeeRecipient = Keypair.generate();
  const trader = Keypair.generate();
  const mint = Keypair.generate();

  const [platformPda] = PublicKey.findProgramAddressSync([Buffer.from("platform")], program.programId);
  const [programData] = PublicKey.findProgramAddressSync([program.programId.toBuffer()], UPGRADEABLE_LOADER);
  const launchpadPda = (id: number) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("launchpad"), new BN(id).toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
  const [curvePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("curve"), mint.publicKey.toBuffer()],
    program.programId
  );
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM.toBuffer(), mint.publicKey.toBuffer()],
    METADATA_PROGRAM
  );
  const curveVault = getAssociatedTokenAddressSync(mint.publicKey, curvePda, true);

  const LAUNCHPAD_CREATION_FEE = new BN(LAMPORTS_PER_SOL); // 1 SOL
  const TOKEN_LAUNCH_FEE = new BN(LAMPORTS_PER_SOL / 50);
  const curveConfig = {
    initialVirtualSol: new BN(30 * LAMPORTS_PER_SOL),
    initialVirtualTokens: new BN("1073000000000000"),
    curveTokenSupply: new BN("793100000000000"),
    lpTokenReserve: new BN("206900000000000"),
  };

  const fund = async (pk: PublicKey, sol: number) => {
    const sig = await conn.requestAirdrop(pk, sol * LAMPORTS_PER_SOL);
    const bh = await conn.getLatestBlockhash();
    await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  };
  const bal = (pk: PublicKey) => conn.getBalance(pk, "processed");
  const curve = () => program.account.bondingCurve.fetch(curvePda);
  const swapAccounts = (user: PublicKey) => ({
    user,
    platform: platformPda,
    launchpad: launchpadPda(0),
    mint: mint.publicKey,
    bondingCurve: curvePda,
    curveVault,
    userTokenAccount: getAssociatedTokenAddressSync(mint.publicKey, user),
  });

  before(async () => {
    // Recipients must already hold rent-exempt SOL to receive small fee claims.
    await Promise.all([
      fund(treasury.publicKey, 1),
      fund(padOwner.publicKey, 10),
      fund(padFeeRecipient.publicKey, 1),
      fund(trader.publicKey, 200),
    ]);
  });

  it("initializes the platform (upgrade authority only)", async () => {
    await program.methods
      .initializePlatform({
        treasury: treasury.publicKey,
        migrationAuthority: wallet.publicKey,
        launchpadCreationFee: LAUNCHPAD_CREATION_FEE,
        platformFeeShareBps: 2500, // platform keeps 25% of every fee
        maxTradeFeeBps: 200, // launchpads may charge up to 2%
      })
      .accountsPartial({
        authority: wallet.publicKey,
        platform: platformPda,
        program: program.programId,
        programData,
      })
      .rpc();

    const p = await program.account.platform.fetch(platformPda);
    assert.equal(p.platformFeeShareBps, 2500);
    assert.equal(p.launchpadCount.toNumber(), 0);
  });

  it("rejects a non-upgrade-authority re-init", async () => {
    try {
      await program.methods
        .initializePlatform({
          treasury: trader.publicKey,
          migrationAuthority: trader.publicKey,
          launchpadCreationFee: new BN(0),
          platformFeeShareBps: 0,
          maxTradeFeeBps: 0,
        })
        .accountsPartial({ authority: trader.publicKey, platform: platformPda, program: program.programId, programData })
        .signers([trader])
        .rpc();
      assert.fail("should fail");
    } catch (e: any) {
      assert.notEqual(e.message, "should fail");
    }
  });

  it("anyone creates a launchpad and pays the creation fee", async () => {
    const before = await bal(treasury.publicKey);
    await program.methods
      .createLaunchpad({
        name: "DegenPad",
        uri: "https://example.com/degenpad.json",
        feeRecipient: padFeeRecipient.publicKey,
        tradeFeeBps: 100, // 1%
        creatorFeeShareBps: 3000, // 30% of post-platform fee to token creator
        tokenLaunchFee: TOKEN_LAUNCH_FEE,
        curve: curveConfig,
      })
      .accountsPartial({
        owner: padOwner.publicKey,
        platform: platformPda,
        treasury: treasury.publicKey,
        launchpad: launchpadPda(0),
      })
      .signers([padOwner])
      .rpc();

    assert.equal((await bal(treasury.publicKey)) - before, LAUNCHPAD_CREATION_FEE.toNumber());
    const lp = await program.account.launchpad.fetch(launchpadPda(0));
    assert.equal(lp.name, "DegenPad");
    assert.equal((await program.account.platform.fetch(platformPda)).launchpadCount.toNumber(), 1);
  });

  it("rejects a trade fee above the platform max", async () => {
    try {
      await program.methods
        .updateLaunchpad({
          newOwner: null, feeRecipient: null, uri: null, tradeFeeBps: 500,
          creatorFeeShareBps: null, tokenLaunchFee: null, curve: null, paused: null,
        })
        .accountsPartial({ owner: padOwner.publicKey, platform: platformPda, launchpad: launchpadPda(0) })
        .signers([padOwner])
        .rpc();
      assert.fail("should fail");
    } catch (e: any) {
      assert.include(e.message, "TradeFeeTooHigh");
    }
  });

  it("launches a token on the launchpad", async () => {
    await program.methods
      .launchToken({ name: "Ception Cat", symbol: "CAT", uri: "https://example.com/cat.json" })
      .accountsPartial({
        creator: wallet.publicKey,
        platform: platformPda,
        launchpad: launchpadPda(0),
        mint: mint.publicKey,
        bondingCurve: curvePda,
        curveVault,
        metadata: metadataPda,
        tokenMetadataProgram: METADATA_PROGRAM,
      })
      .signers([mint])
      .rpc();

    const c = await curve();
    assert.equal(c.realTokenReserves.toString(), curveConfig.curveTokenSupply.toString());
    // launch fee split: 25% platform, 75% launchpad
    assert.equal(c.platformFeesAccrued.toNumber(), TOKEN_LAUNCH_FEE.toNumber() / 4);
    assert.equal(c.launchpadFeesAccrued.toNumber(), (TOKEN_LAUNCH_FEE.toNumber() * 3) / 4);
    const vault = await getAccount(conn, curveVault);
    assert.equal(vault.amount.toString(), "1000000000000000");
  });

  it("buys and sells on the curve", async () => {
    await program.methods
      .buy(new BN(LAMPORTS_PER_SOL), new BN(1))
      .accountsPartial(swapAccounts(trader.publicKey))
      .signers([trader])
      .rpc();

    const ata = getAssociatedTokenAddressSync(mint.publicKey, trader.publicKey);
    const bought = (await getAccount(conn, ata)).amount;
    assert.isTrue(bought > 0n);

    let c = await curve();
    assert.equal(c.realSolReserves.toNumber(), 0.99 * LAMPORTS_PER_SOL); // 1% fee

    const solBefore = await bal(trader.publicKey);
    await program.methods
      .sell(new BN((bought / 2n).toString()), new BN(1))
      .accountsPartial(swapAccounts(trader.publicKey))
      .signers([trader])
      .rpc();
    assert.isTrue((await bal(trader.publicKey)) > solBefore);

    c = await curve();
    // curve lamports always cover reserves + accrued fees
    const rent = await conn.getMinimumBalanceForRentExemption(
      (await conn.getAccountInfo(curvePda))!.data.length
    );
    const accrued =
      c.platformFeesAccrued.toNumber() + c.launchpadFeesAccrued.toNumber() + c.creatorFeesAccrued.toNumber();
    assert.equal(await bal(curvePda), rent + c.realSolReserves.toNumber() + accrued);
  });

  it("enforces slippage", async () => {
    try {
      await program.methods
        .buy(new BN(LAMPORTS_PER_SOL / 10), new BN("999999999999999"))
        .accountsPartial(swapAccounts(trader.publicKey))
        .signers([trader])
        .rpc();
      assert.fail("should fail");
    } catch (e: any) {
      assert.include(e.message, "SlippageExceeded");
    }
  });

  it("completes the curve and only charges for what is left", async () => {
    const solBefore = await bal(trader.publicKey);
    await program.methods
      .buy(new BN(150 * LAMPORTS_PER_SOL), new BN(1))
      .accountsPartial(swapAccounts(trader.publicKey))
      .signers([trader])
      .rpc();
    const spent = solBefore - (await bal(trader.publicKey));
    assert.isBelow(spent, 100 * LAMPORTS_PER_SOL);

    const c = await curve();
    assert.isTrue(c.complete);
    assert.equal(c.realTokenReserves.toNumber(), 0);

    try {
      await program.methods
        .buy(new BN(LAMPORTS_PER_SOL), new BN(1))
        .accountsPartial(swapAccounts(trader.publicKey))
        .signers([trader])
        .rpc();
      assert.fail("should fail");
    } catch (e: any) {
      assert.include(e.message, "CurveComplete");
    }
  });

  it("claims all three fee buckets to the right wallets", async () => {
    const c = await curve();
    const cases: [any, PublicKey, number][] = [
      [{ platform: {} }, treasury.publicKey, c.platformFeesAccrued.toNumber()],
      [{ launchpad: {} }, padFeeRecipient.publicKey, c.launchpadFeesAccrued.toNumber()],
      [{ creator: {} }, wallet.publicKey, c.creatorFeesAccrued.toNumber()],
    ];
    for (const [bucket, recipient, amount] of cases) {
      assert.isAbove(amount, 0);
      const before = await bal(recipient);
      await program.methods
        .claimFees(bucket)
        .accountsPartial({ platform: platformPda, launchpad: launchpadPda(0), bondingCurve: curvePda, recipient })
        .rpc(); // permissionless: any wallet can crank it
      const delta = (await bal(recipient)) - before;
      // creator == provider wallet also pays the tx fee
      if (recipient.equals(wallet.publicKey)) assert.isAbove(delta, 0);
      else assert.equal(delta, amount);
    }

    try {
      await program.methods
        .claimFees({ platform: {} })
        .accountsPartial({ platform: platformPda, launchpad: launchpadPda(0), bondingCurve: curvePda, recipient: trader.publicKey })
        .rpc();
      assert.fail("should fail");
    } catch (e: any) {
      assert.include(e.message, "WrongFeeRecipient");
    }
  });

  it("migration authority withdraws graduated liquidity", async () => {
    const reserves = (await curve()).realSolReserves.toNumber();
    assert.isAbove(reserves, 80 * LAMPORTS_PER_SOL);

    await program.methods
      .withdrawForMigration()
      .accountsPartial({
        migrationAuthority: wallet.publicKey,
        platform: platformPda,
        mint: mint.publicKey,
        bondingCurve: curvePda,
        curveVault,
      })
      .rpc();

    const c = await curve();
    assert.isTrue(c.migrated);
    assert.equal(c.realSolReserves.toNumber(), 0);
    const lpTokens = await getAccount(conn, getAssociatedTokenAddressSync(mint.publicKey, wallet.publicKey));
    assert.equal(lpTokens.amount.toString(), curveConfig.lpTokenReserve.toString());
  });
});
