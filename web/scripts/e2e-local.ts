// Exercises the frontend's lib against a local validator.
// NEXT_PUBLIC_PROGRAM_ID=... NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899 npx tsx scripts/e2e-local.ts
import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import {
  DEFAULT_CURVE,
  buyIx,
  claimTxs,
  createLaunchpadTx,
  curveProgress,
  effectiveFeeBps,
  fetchCurve,
  fetchCurves,
  fetchLaunchpad,
  fetchLaunchpads,
  fetchPlatform,
  fetchTrades,
  getProgram,
  launchTokenTx,
  sellIx,
} from "../src/lib/solception";
import { minusSlippage, priceSol, quoteBuy, quoteSell } from "../src/lib/math";

const conn = new Connection(process.env.NEXT_PUBLIC_RPC_URL!, "confirmed");
const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf8"))));
const user = Keypair.generate();
const asWallet = (kp: Keypair) => ({
  publicKey: kp.publicKey,
  signTransaction: async <T extends Transaction>(t: T) => (t.partialSign(kp), t),
  signAllTransactions: async <T extends Transaction>(ts: T[]) => (ts.forEach((t) => t.partialSign(kp)), ts),
});
const ok = (cond: unknown, msg: string) => {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("  ✔", msg);
};

(async () => {
  await conn.confirmTransaction(await conn.requestAirdrop(user.publicKey, 100 * LAMPORTS_PER_SOL), "confirmed");
  const p = getProgram(conn, asWallet(user) as never);

  const platform = (await fetchPlatform(p))!;
  ok(platform && platform.launchpadCreationFee === 1_000_000_000n, "platform loaded, 1 SOL creation fee");

  const treasuryBefore = await conn.getBalance(platform.treasury);
  const { tx, id } = await createLaunchpadTx(p, user.publicKey, platform, {
    name: "Neon Pad",
    uri: "https://neonpad.xyz",
    feeRecipient: user.publicKey,
    tradeFeeBps: 100,
    creatorFeeShareBps: 3000,
    tokenLaunchFee: 20_000_000n,
    curve: DEFAULT_CURVE,
  });
  await sendAndConfirmTransaction(conn, tx, [user]);
  ok((await conn.getBalance(platform.treasury)) - treasuryBefore === LAMPORTS_PER_SOL, "create launchpad paid 1 SOL to treasury");
  const pad = (await fetchLaunchpad(p, id))!;
  ok(pad.name === "Neon Pad", `launchpad #${id} readable`);
  ok((await fetchLaunchpads(p)).some((x) => x.id === id), "listed in fetchLaunchpads");

  // launch with dev buy of 0.5 SOL
  const q0 = quoteBuy({ vs: pad.curve.initialVirtualSol, vt: pad.curve.initialVirtualTokens, realSol: 0n, realTokens: pad.curve.curveTokenSupply }, 500_000_000n, 100);
  const { tx: ltx, mint } = await launchTokenTx(p, user.publicKey, pad.address, { name: "Neon Cat", symbol: "NCAT", uri: "http://localhost:3000/api/meta?n=Neon%20Cat&s=NCAT" }, { maxSolCost: 500_000_000n, minTokensOut: minusSlippage(q0.tokensOut, 1) });
  await sendAndConfirmTransaction(conn, ltx, [user, mint]);
  let c = (await fetchCurve(p, mint.publicKey))!;
  ok(c.totalSupply - c.lpReserve - c.realTokens === q0.tokensOut, "launch + dev buy got exactly the quoted tokens");
  ok((await fetchCurves(p, pad.address)).length === 1, "fetchCurves(pad) filter works");

  // buy 2 SOL
  const fee = effectiveFeeBps(pad, platform);
  const q1 = quoteBuy({ vs: c.vs, vt: c.vt, realSol: c.realSol, realTokens: c.realTokens }, 2_000_000_000n, fee);
  await sendAndConfirmTransaction(conn, new Transaction().add(await buyIx(p, user.publicKey, pad.address, mint.publicKey, 2_000_000_000n, minusSlippage(q1.tokensOut, 2))), [user]);
  const c2 = (await fetchCurve(p, mint.publicKey))!;
  ok(c.realTokens - c2.realTokens === q1.tokensOut, "buy matches quote exactly");

  // sell half of a buy
  const sellAmt = q1.tokensOut / 2n;
  const q2 = quoteSell({ vs: c2.vs, vt: c2.vt, realSol: c2.realSol, realTokens: c2.realTokens }, sellAmt, fee);
  const before = await conn.getBalance(user.publicKey);
  await sendAndConfirmTransaction(conn, new Transaction().add(await sellIx(p, user.publicKey, pad.address, mint.publicKey, sellAmt, minusSlippage(q2.net, 2))), [user]);
  const after = await conn.getBalance(user.publicKey);
  ok(after - before === Number(q2.net) - 5000, "sell paid exactly the quoted SOL (minus tx fee)");

  let trades = await fetchTrades(p, c2.address);
  for (let i = 0; i < 5 && trades.length < 3; i++) {
    await new Promise((r) => setTimeout(r, 1000)); // RPC signature index can lag a moment
    trades = await fetchTrades(p, c2.address);
  }
  ok(trades.length === 3 && trades[0].isBuy && trades[0].solAmount < trades[1].solAmount && !trades[2].isBuy, `fetchTrades parsed ${trades.length} events in chronological order`);
  ok(priceSol(trades[2].vs, trades[2].vt) > 0, "chart price from events");

  c = (await fetchCurve(p, mint.publicKey))!;
  ok(curveProgress(c) > 0 && curveProgress(c) < 1, `progress ${(curveProgress(c) * 100).toFixed(2)}%`);

  // claims: launchpad + creator (user), platform (treasury) -- one batch
  const txs = await claimTxs(p, [
    { curve: c, bucket: "launchpad", recipient: pad.feeRecipient },
    { curve: c, bucket: "creator", recipient: c.creator },
    { curve: c, bucket: "platform", recipient: platform.treasury },
  ]);
  for (const t of txs) await sendAndConfirmTransaction(conn, t, [user]);
  c = (await fetchCurve(p, mint.publicKey))!;
  ok(c.launchpadFees === 0n && c.creatorFees === 0n && c.platformFees === 0n, "all three fee buckets claimed");

  // print for UI screenshots
  fs.writeFileSync(process.env.OUT || "/dev/null", JSON.stringify({ padId: id, mint: mint.publicKey.toBase58(), user: Array.from(user.secretKey) }));
  console.log("\nALL GOOD. pad", id, "mint", mint.publicKey.toBase58());
  void authority;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
