import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "6uQVicnMFGPnk12qUFkikhqzyfnhpk7vNDXuT8pUhhhz"
);
export const CLUSTER = process.env.NEXT_PUBLIC_CLUSTER || "devnet";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

export const TOKEN_DECIMALS = 6;
export const LAMPORTS = 1_000_000_000n;
export const TOKEN_UNIT = 1_000_000n;

export function explorerUrl(value: string, kind: "address" | "tx" = "address") {
  const q =
    CLUSTER === "mainnet-beta"
      ? ""
      : CLUSTER.startsWith("http")
        ? `?cluster=custom&customUrl=${encodeURIComponent(CLUSTER)}`
        : `?cluster=${CLUSTER}`;
  return `https://explorer.solana.com/${kind}/${value}${q}`;
}
