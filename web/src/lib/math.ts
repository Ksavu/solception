// Mirrors programs/solception/src/math.rs exactly (BigInt, same rounding).

const BPS = 10_000n;
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

export const bpsOf = (amount: bigint, bps: number) => (amount * BigInt(bps)) / BPS;

export function tokensOutForSol(vs: bigint, vt: bigint, solIn: bigint): bigint {
  if (solIn <= 0n) return 0n;
  const k = vs * vt;
  return vt - ceilDiv(k, vs + solIn);
}

export function solInForTokens(vs: bigint, vt: bigint, tokens: bigint): bigint | null {
  if (tokens <= 0n) return 0n;
  if (tokens >= vt) return null;
  const k = vs * vt;
  return ceilDiv(k, vt - tokens) - vs;
}

export function solOutForTokens(vs: bigint, vt: bigint, tokensIn: bigint): bigint {
  if (tokensIn <= 0n) return 0n;
  const k = vs * vt;
  return vs - ceilDiv(k, vt + tokensIn);
}

export interface CurveState {
  vs: bigint;
  vt: bigint;
  realSol: bigint;
  realTokens: bigint;
}

export interface BuyQuote {
  tokensOut: bigint;
  netSol: bigint;
  fee: bigint;
  totalCost: bigint;
  completes: boolean;
}

/** Same logic as the on-chain `buy` with `max_sol_cost = solIn`. */
export function quoteBuy(c: CurveState, solIn: bigint, feeBps: number): BuyQuote {
  let fee = bpsOf(solIn, feeBps);
  let netSol = solIn - fee;
  let tokensOut = tokensOutForSol(c.vs, c.vt, netSol);
  const completes = tokensOut >= c.realTokens;
  if (completes) {
    tokensOut = c.realTokens;
    netSol = solInForTokens(c.vs, c.vt, tokensOut) ?? netSol;
    fee = bpsOf(netSol, feeBps);
  }
  return { tokensOut, netSol, fee, totalCost: netSol + fee, completes };
}

export interface SellQuote {
  gross: bigint;
  fee: bigint;
  net: bigint;
  exceedsReserves: boolean;
}

export function quoteSell(c: CurveState, tokensIn: bigint, feeBps: number): SellQuote {
  const gross = solOutForTokens(c.vs, c.vt, tokensIn);
  const fee = bpsOf(gross, feeBps);
  return { gross, fee, net: gross - fee, exceedsReserves: gross > c.realSol };
}

/** SOL per whole token. */
export function priceSol(vs: bigint, vt: bigint): number {
  if (vt === 0n) return 0;
  return Number(vs) / 1e9 / (Number(vt) / 1e6);
}

/** Apply slippage tolerance (in %) downward. */
export const minusSlippage = (x: bigint, pct: number) =>
  (x * BigInt(Math.round((100 - pct) * 100))) / 10_000n;
