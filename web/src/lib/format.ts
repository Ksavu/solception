import { PublicKey } from "@solana/web3.js";

export const short = (pk: PublicKey | string, n = 4) => {
  const s = typeof pk === "string" ? pk : pk.toBase58();
  return `${s.slice(0, n)}…${s.slice(-n)}`;
};

export function lamportsToSol(l: bigint | number): number {
  return Number(l) / 1e9;
}

export function fmtSol(l: bigint | number, digits = 4): string {
  const v = lamportsToSol(l);
  if (v === 0) return "0";
  if (Math.abs(v) < 0.0001) return v.toExponential(2);
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtNum(v: number, digits = 2): string {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(digits) + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(digits) + "M";
  if (a >= 1e3) return (v / 1e3).toFixed(digits) + "K";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export const fmtTokens = (base: bigint | number) => fmtNum(Number(base) / 1e6);

const SUB = "₀₁₂₃₄₅₆₇₈₉";
/** 0.00000003073 -> "0.0₇3073" (zero-count subscript, like DEX screeners). */
export function fmtPrice(sol: number): string {
  if (sol === 0) return "0";
  if (sol >= 0.001) return sol.toLocaleString("en-US", { maximumSignificantDigits: 4 });
  const zeros = Math.floor(-Math.log10(sol));
  const digits = Math.round(sol * 10 ** (zeros + 4)).toString().replace(/0+$/, "") || "0";
  const sub = String(zeros).split("").map((d) => SUB[+d]).join("");
  return `0.0${sub}${digits}`;
}

export function timeAgo(unix: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unix));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Parse a decimal string into base units without floating point. */
export function parseUnits(input: string, decimals: number): bigint | null {
  const s = input.trim();
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") return null;
  const [w, f = ""] = s.split(".");
  if (f.length > decimals) return null;
  return BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt((f + "0".repeat(decimals)).slice(0, decimals) || "0");
}

export function hashHue(s: string): [number, number] {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return [h % 360, (h >> 9) % 360];
}
