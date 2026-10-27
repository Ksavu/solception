"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, Transaction } from "@solana/web3.js";
import { getProgram } from "./solception";
import { useToast } from "@/components/Toasts";
import { explorerUrl } from "./config";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(() => getProgram(connection, wallet), [connection, wallet]);
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], intervalMs?: number) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    try {
      const v = await fnRef.current();
      setData(v);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    reload();
    if (!intervalMs) return;
    const t = setInterval(reload, intervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload };
}

function errorMessage(e: unknown): string {
  const any = e as { message?: string; logs?: string[] };
  const logs = any?.logs?.join("\n") ?? "";
  const m = (logs + "\n" + (any?.message ?? String(e))).match(/Error Message: ([^.\n]+)/);
  if (m) return m[1];
  if (any?.message?.includes("User rejected")) return "Transaction cancelled";
  return any?.message?.slice(0, 160) ?? "Transaction failed";
}

/** Sign + send + confirm a list of transactions through the connected wallet. */
export function useSend() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const send = useCallback(
    async (label: string, txs: Transaction | Transaction[], signers: Keypair[] = []) => {
      if (!publicKey) {
        toast.push({ kind: "error", text: "Connect your wallet first" });
        return null;
      }
      setBusy(true);
      const list = Array.isArray(txs) ? txs : [txs];
      const id = toast.push({ kind: "pending", text: `${label}…` });
      try {
        let last = "";
        for (const tx of list) {
          const bh = await connection.getLatestBlockhash("confirmed");
          tx.feePayer = publicKey;
          tx.recentBlockhash = bh.blockhash;
          const sig = await sendTransaction(tx, connection, { signers, skipPreflight: false });
          const res = await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
          if (res.value.err) throw new Error("Transaction failed on-chain");
          last = sig;
        }
        toast.update(id, { kind: "success", text: label, link: explorerUrl(last, "tx") });
        return last;
      } catch (e) {
        console.error(e);
        toast.update(id, { kind: "error", text: errorMessage(e) });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [connection, publicKey, sendTransaction, toast]
  );

  return { send, busy };
}
