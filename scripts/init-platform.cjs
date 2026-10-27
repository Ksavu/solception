const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");
const os = require("os");
const path = require("path");
const idl = require("../target/idl/solception.json");

const LAUNCHPAD_CREATION_FEE_SOL = 1;
const PLATFORM_FEE_SHARE_BPS = 2500;
const MAX_TRADE_FEE_BPS = 200;

(async () => {
  const rpc = process.env.RPC_URL || "https://api.devnet.solana.com";
  const walletPath = process.env.WALLET || path.join(os.homedir(), ".config/solana/id.json");
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8"))));
  const provider = new anchor.AnchorProvider(new Connection(rpc, "confirmed"), new anchor.Wallet(kp), { commitment: "confirmed" });
  const program = new anchor.Program(idl, provider);

  const [platform] = PublicKey.findProgramAddressSync([Buffer.from("platform")], program.programId);
  const [programData] = PublicKey.findProgramAddressSync([program.programId.toBuffer()], new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111"));
  const treasury = new PublicKey(process.env.TREASURY || kp.publicKey);

  console.log("Program:  ", program.programId.toBase58());
  console.log("Authority:", kp.publicKey.toBase58());

  if (!(await provider.connection.getAccountInfo(platform))) {
    const sig = await program.methods
      .initializePlatform({
        treasury,
        migrationAuthority: kp.publicKey,
        launchpadCreationFee: new anchor.BN(LAUNCHPAD_CREATION_FEE_SOL * LAMPORTS_PER_SOL),
        platformFeeShareBps: PLATFORM_FEE_SHARE_BPS,
        maxTradeFeeBps: MAX_TRADE_FEE_BPS,
      })
      .accountsPartial({ authority: kp.publicKey, platform, program: program.programId, programData })
      .rpc();
    console.log("Initialized. Tx:", sig);
  } else {
    console.log("Platform already initialized.");
  }

  const p = await program.account.platform.fetch(platform);
  console.log("\nPlatform:", platform.toBase58());
  console.log("  Treasury:              ", p.treasury.toBase58());
  console.log("  Launchpad creation fee:", p.launchpadCreationFee.toNumber() / LAMPORTS_PER_SOL, "SOL");
  console.log("  Platform fee share:    ", p.platformFeeShareBps / 100, "%");
  console.log("  Max trade fee:         ", p.maxTradeFeeBps / 100, "%");
})().catch((e) => { console.error(e); process.exit(1); });
