"use client";

import { Buffer } from "buffer";
import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { RPC_URL } from "@/lib/config";
import { ToastProvider } from "./Toasts";

if (typeof window !== "undefined") {
  (window as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;
}

export default function Providers({ children }: { children: ReactNode }) {
  // Phantom, Solflare, Backpack etc. register via the Wallet Standard automatically.
  const wallets = useMemo(() => [], []);
  return (
    <ConnectionProvider endpoint={RPC_URL} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ToastProvider>{children}</ToastProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
