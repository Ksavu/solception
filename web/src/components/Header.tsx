"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { CLUSTER } from "@/lib/config";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <button className="wallet-adapter-button">Select Wallet</button> }
);

const NAV = [
  { href: "/", label: "Explore" },
  { href: "/create", label: "Create Launchpad" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Header() {
  const path = usePathname();
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo">
          <span className="logo-mark">
            <i />
            <i />
            <i />
          </span>
          <span className="logo-text">SOLCEPTION</span>
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="header-right">
          {CLUSTER !== "mainnet-beta" && <span className="cluster">{CLUSTER.startsWith("http") ? "LOCAL" : CLUSTER.toUpperCase()}</span>}
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
