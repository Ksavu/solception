import { AnchorProvider, BN, BorshCoder, EventParser, Program } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Buffer } from "buffer";
import idlJson from "@/idl/solception.json";
import type { Solception } from "@/idl/solception";
import { PROGRAM_ID } from "./config";

export const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

const idl = { ...(idlJson as object), address: PROGRAM_ID.toBase58() } as unknown as Solception;
export type SolceptionProgram = Program<Solception>;

const readonlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T,>(t: T) => t,
  signAllTransactions: async <T,>(t: T[]) => t,
};

export function getProgram(connection: Connection, wallet?: AnchorWallet | null): SolceptionProgram {
  const provider = new AnchorProvider(connection, (wallet ?? readonlyWallet) as AnchorWallet, {
    commitment: "confirmed",
  });
  return new Program<Solception>(idl, provider);
}

// ---------- PDAs ----------
const pda = (seeds: (Buffer | Uint8Array)[], program = PROGRAM_ID) =>
  PublicKey.findProgramAddressSync(seeds, program)[0];

export const platformPda = () => pda([Buffer.from("platform")]);
export const launchpadPda = (id: number | bigint) =>
  pda([Buffer.from("launchpad"), new BN(id.toString()).toArrayLike(Buffer, "le", 8)]);
export const curvePda = (mint: PublicKey) => pda([Buffer.from("curve"), mint.toBuffer()]);
export const metadataPda = (mint: PublicKey) =>
  pda([Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()], METADATA_PROGRAM_ID);
export const programDataPda = () => pda([PROGRAM_ID.toBuffer()], UPGRADEABLE_LOADER);

// ---------- Normalized types (BN -> bigint) ----------
const big = (x: BN) => BigInt(x.toString());

export interface Platform {
  address: PublicKey;
  authority: PublicKey;
  treasury: PublicKey;
  migrationAuthority: PublicKey;
  launchpadCreationFee: bigint;
  platformFeeShareBps: number;
  maxTradeFeeBps: number;
  launchpadCount: number;
  paused: boolean;
}

export interface CurveConfig {
  initialVirtualSol: bigint;
  initialVirtualTokens: bigint;
  curveTokenSupply: bigint;
  lpTokenReserve: bigint;
}

export interface Launchpad {
  address: PublicKey;
  id: number;
  owner: PublicKey;
  feeRecipient: PublicKey;
  name: string;
  uri: string;
  tradeFeeBps: number;
  creatorFeeShareBps: number;
  tokenLaunchFee: bigint;
  curve: CurveConfig;
  tokenCount: number;
  paused: boolean;
  createdAt: number;
}

export interface Curve {
  address: PublicKey;
  launchpad: PublicKey;
  mint: PublicKey;
  creator: PublicKey;
  vs: bigint;
  vt: bigint;
  realSol: bigint;
  realTokens: bigint;
  lpReserve: bigint;
  totalSupply: bigint;
  platformFees: bigint;
  launchpadFees: bigint;
  creatorFees: bigint;
  complete: boolean;
  migrated: boolean;
  createdAt: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPlatform(address: PublicKey, a: any): Platform {
  return {
    address,
    authority: a.authority,
    treasury: a.treasury,
    migrationAuthority: a.migrationAuthority,
    launchpadCreationFee: big(a.launchpadCreationFee),
    platformFeeShareBps: a.platformFeeShareBps,
    maxTradeFeeBps: a.maxTradeFeeBps,
    launchpadCount: Number(a.launchpadCount.toString()),
    paused: a.paused,
  };
}

function toLaunchpad(address: PublicKey, a: any): Launchpad {
  return {
    address,
    id: Number(a.id.toString()),
    owner: a.owner,
    feeRecipient: a.feeRecipient,
    name: a.name,
    uri: a.uri,
    tradeFeeBps: a.tradeFeeBps,
    creatorFeeShareBps: a.creatorFeeShareBps,
    tokenLaunchFee: big(a.tokenLaunchFee),
    curve: {
      initialVirtualSol: big(a.curve.initialVirtualSol),
      initialVirtualTokens: big(a.curve.initialVirtualTokens),
      curveTokenSupply: big(a.curve.curveTokenSupply),
      lpTokenReserve: big(a.curve.lpTokenReserve),
    },
    tokenCount: Number(a.tokenCount.toString()),
    paused: a.paused,
    createdAt: Number(a.createdAt.toString()),
  };
}

function toCurve(address: PublicKey, a: any): Curve {
  return {
    address,
    launchpad: a.launchpad,
    mint: a.mint,
    creator: a.creator,
    vs: big(a.virtualSolReserves),
    vt: big(a.virtualTokenReserves),
    realSol: big(a.realSolReserves),
    realTokens: big(a.realTokenReserves),
    lpReserve: big(a.lpTokenReserve),
    totalSupply: big(a.tokenTotalSupply),
    platformFees: big(a.platformFeesAccrued),
    launchpadFees: big(a.launchpadFeesAccrued),
    creatorFees: big(a.creatorFeesAccrued),
    complete: a.complete,
    migrated: a.migrated,
    createdAt: Number(a.createdAt.toString()),
  };
}

// ---------- Fetchers ----------
export async function fetchPlatform(p: SolceptionProgram): Promise<Platform | null> {
  const addr = platformPda();
  const a = await p.account.platform.fetchNullable(addr);
  return a ? toPlatform(addr, a) : null;
}

export async function fetchLaunchpads(p: SolceptionProgram): Promise<Launchpad[]> {
  const all = await p.account.launchpad.all();
  return all.map((x) => toLaunchpad(x.publicKey, x.account)).sort((a, b) => a.id - b.id);
}

export async function fetchLaunchpad(p: SolceptionProgram, id: number): Promise<Launchpad | null> {
  const addr = launchpadPda(id);
  const a = await p.account.launchpad.fetchNullable(addr);
  return a ? toLaunchpad(addr, a) : null;
}

export async function fetchLaunchpadByAddress(p: SolceptionProgram, addr: PublicKey) {
  const a = await p.account.launchpad.fetchNullable(addr);
  return a ? toLaunchpad(addr, a) : null;
}

export async function fetchCurves(p: SolceptionProgram, launchpad?: PublicKey): Promise<Curve[]> {
  const filters = launchpad ? [{ memcmp: { offset: 8, bytes: launchpad.toBase58() } }] : [];
  const all = await p.account.bondingCurve.all(filters);
  return all.map((x) => toCurve(x.publicKey, x.account)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchCurve(p: SolceptionProgram, mint: PublicKey): Promise<Curve | null> {
  const addr = curvePda(mint);
  const a = await p.account.bondingCurve.fetchNullable(addr);
  return a ? toCurve(addr, a) : null;
}

// ---------- Derived values ----------
export const effectiveFeeBps = (pad: Launchpad, platform: Platform) =>
  Math.min(pad.tradeFeeBps, platform.maxTradeFeeBps);

/** Tokens the curve could sell in total (fixed at launch). */
export const curveSupply = (c: Curve) => c.totalSupply - (c.migrated ? 0n : c.lpReserve);

export function curveProgress(c: Curve): number {
  if (c.complete || c.migrated) return 1;
  const supply = c.totalSupply - c.lpReserve;
  if (supply <= 0n) return 0;
  return Number(supply - c.realTokens) / Number(supply);
}

// ---------- Token metadata (Metaplex) ----------
export interface TokenMeta {
  name: string;
  symbol: string;
  uri: string;
}

function readString(buf: Buffer, offset: number): [string, number] {
  const len = buf.readUInt32LE(offset);
  const s = buf.subarray(offset + 4, offset + 4 + len).toString("utf8").replace(/\0/g, "").trim();
  return [s, offset + 4 + len];
}

export function parseMetadata(data: Buffer): TokenMeta | null {
  try {
    let o = 1 + 32 + 32; // key, update authority, mint
    const [name, o1] = readString(data, o);
    o = o1;
    const [symbol, o2] = readString(data, o);
    o = o2;
    const [uri] = readString(data, o);
    return { name, symbol, uri };
  } catch {
    return null;
  }
}

export async function fetchMetadata(conn: Connection, mints: PublicKey[]): Promise<Map<string, TokenMeta>> {
  const out = new Map<string, TokenMeta>();
  for (let i = 0; i < mints.length; i += 100) {
    const chunk = mints.slice(i, i + 100);
    const infos = await conn.getMultipleAccountsInfo(chunk.map(metadataPda));
    infos.forEach((info, j) => {
      if (!info) return;
      const m = parseMetadata(Buffer.from(info.data));
      if (m) out.set(chunk[j].toBase58(), m);
    });
  }
  return out;
}

const imageCache = new Map<string, Promise<string | null>>();
export function fetchImage(uri: string): Promise<string | null> {
  if (!uri || !/^https?:\/\//.test(uri)) return Promise.resolve(null);
  if (!imageCache.has(uri)) {
    imageCache.set(
      uri,
      fetch(uri)
        .then(async (r) => {
          const type = r.headers.get("content-type") || "";
          if (type.startsWith("image/")) return uri;
          const j = await r.json();
          return typeof j.image === "string" ? j.image : null;
        })
        .catch(() => null)
    );
  }
  return imageCache.get(uri)!;
}

// ---------- Trades (from on-chain event logs) ----------
export interface TradeEvent {
  signature: string;
  isBuy: boolean;
  user: PublicKey;
  solAmount: bigint;
  tokenAmount: bigint;
  vs: bigint;
  vt: bigint;
  timestamp: number;
}

const field = (d: any, camel: string) =>
  d[camel] ?? d[camel.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())];

export async function fetchTrades(p: SolceptionProgram, curve: PublicKey, limit = 60): Promise<TradeEvent[]> {
  const conn = p.provider.connection;
  const sigs = await conn.getSignaturesForAddress(curve, { limit }, "confirmed");
  const ok = sigs.filter((s) => !s.err).map((s) => s.signature);
  if (ok.length === 0) return [];
  const txs = await conn.getTransactions(ok, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  const parser = new EventParser(PROGRAM_ID, new BorshCoder(idl));
  const out: TradeEvent[] = [];
  txs.forEach((tx, i) => {
    const logs = tx?.meta?.logMessages;
    if (!logs) return;
    for (const ev of parser.parseLogs(logs)) {
      if (ev.name.toLowerCase() !== "trade") continue;
      const d = ev.data as any;
      out.push({
        signature: ok[i],
        isBuy: field(d, "isBuy"),
        user: field(d, "user"),
        solAmount: big(field(d, "solAmount")),
        tokenAmount: big(field(d, "tokenAmount")),
        vs: big(field(d, "virtualSolReserves")),
        vt: big(field(d, "virtualTokenReserves")),
        timestamp: Number(field(d, "timestamp").toString()),
      });
    }
  });
  // signatures come newest-first (slot order), so reverse for chronological order
  return out.reverse();
}

// ---------- Transactions ----------
export interface CreateLaunchpadInput {
  name: string;
  uri: string;
  feeRecipient: PublicKey;
  tradeFeeBps: number;
  creatorFeeShareBps: number;
  tokenLaunchFee: bigint;
  curve: CurveConfig;
}

const bn = (x: bigint) => new BN(x.toString());

export const DEFAULT_CURVE: CurveConfig = {
  initialVirtualSol: 30_000_000_000n,
  initialVirtualTokens: 1_073_000_000_000_000n,
  curveTokenSupply: 793_100_000_000_000n,
  lpTokenReserve: 206_900_000_000_000n,
};

export async function createLaunchpadTx(
  p: SolceptionProgram,
  owner: PublicKey,
  platform: Platform,
  input: CreateLaunchpadInput
): Promise<{ tx: Transaction; launchpad: PublicKey; id: number }> {
  const id = platform.launchpadCount;
  const launchpad = launchpadPda(id);
  const tx = await p.methods
    .createLaunchpad({
      name: input.name,
      uri: input.uri,
      feeRecipient: input.feeRecipient,
      tradeFeeBps: input.tradeFeeBps,
      creatorFeeShareBps: input.creatorFeeShareBps,
      tokenLaunchFee: bn(input.tokenLaunchFee),
      curve: {
        initialVirtualSol: bn(input.curve.initialVirtualSol),
        initialVirtualTokens: bn(input.curve.initialVirtualTokens),
        curveTokenSupply: bn(input.curve.curveTokenSupply),
        lpTokenReserve: bn(input.curve.lpTokenReserve),
      },
    })
    .accountsPartial({ owner, platform: platformPda(), treasury: platform.treasury, launchpad })
    .transaction();
  return { tx, launchpad, id };
}

function swapAccounts(user: PublicKey, launchpad: PublicKey, mint: PublicKey) {
  const curve = curvePda(mint);
  return {
    user,
    platform: platformPda(),
    launchpad,
    mint,
    bondingCurve: curve,
    curveVault: getAssociatedTokenAddressSync(mint, curve, true),
    userTokenAccount: getAssociatedTokenAddressSync(mint, user),
  };
}

export function buyIx(
  p: SolceptionProgram,
  user: PublicKey,
  launchpad: PublicKey,
  mint: PublicKey,
  maxSolCost: bigint,
  minTokensOut: bigint
): Promise<TransactionInstruction> {
  return p.methods
    .buy(bn(maxSolCost), bn(minTokensOut))
    .accountsPartial(swapAccounts(user, launchpad, mint))
    .instruction();
}

export function sellIx(
  p: SolceptionProgram,
  user: PublicKey,
  launchpad: PublicKey,
  mint: PublicKey,
  tokenAmount: bigint,
  minSolOut: bigint
): Promise<TransactionInstruction> {
  return p.methods
    .sell(bn(tokenAmount), bn(minSolOut))
    .accountsPartial(swapAccounts(user, launchpad, mint))
    .instruction();
}

export async function launchTokenTx(
  p: SolceptionProgram,
  creator: PublicKey,
  launchpad: PublicKey,
  meta: TokenMeta,
  initialBuy?: { maxSolCost: bigint; minTokensOut: bigint }
): Promise<{ tx: Transaction; mint: Keypair }> {
  const mint = Keypair.generate();
  const curve = curvePda(mint.publicKey);
  const launchIx = await p.methods
    .launchToken({ name: meta.name, symbol: meta.symbol, uri: meta.uri })
    .accountsPartial({
      creator,
      platform: platformPda(),
      launchpad,
      mint: mint.publicKey,
      bondingCurve: curve,
      curveVault: getAssociatedTokenAddressSync(mint.publicKey, curve, true),
      metadata: metadataPda(mint.publicKey),
      tokenMetadataProgram: METADATA_PROGRAM_ID,
    })
    .instruction();
  const tx = new Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), launchIx);
  if (initialBuy && initialBuy.maxSolCost > 0n) {
    tx.add(await buyIx(p, creator, launchpad, mint.publicKey, initialBuy.maxSolCost, initialBuy.minTokensOut));
  }
  return { tx, mint };
}

export type FeeBucket = "platform" | "launchpad" | "creator";

export function claimIx(
  p: SolceptionProgram,
  curve: Curve,
  bucket: FeeBucket,
  recipient: PublicKey
): Promise<TransactionInstruction> {
  const arg = { [bucket]: {} } as any;
  return p.methods
    .claimFees(arg)
    .accountsPartial({
      platform: platformPda(),
      launchpad: curve.launchpad,
      bondingCurve: curve.address,
      recipient,
    })
    .instruction();
}

/** Group claim instructions into transactions of `perTx`. */
export async function claimTxs(
  p: SolceptionProgram,
  items: { curve: Curve; bucket: FeeBucket; recipient: PublicKey }[],
  perTx = 6
): Promise<Transaction[]> {
  const txs: Transaction[] = [];
  for (let i = 0; i < items.length; i += perTx) {
    const ixs = await Promise.all(items.slice(i, i + perTx).map((x) => claimIx(p, x.curve, x.bucket, x.recipient)));
    txs.push(new Transaction().add(...ixs));
  }
  return txs;
}
