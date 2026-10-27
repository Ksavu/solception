"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAsync, useProgram } from "@/lib/hooks";
import { fetchCurves, fetchLaunchpads, fetchMetadata, fetchPlatform } from "@/lib/solception";
import { Empty, PadCard, Skeleton, Stat, TokenCard } from "@/components/ui";
import { fmtSol } from "@/lib/format";

export default function Home() {
  const program = useProgram();
  const { connection } = useConnection();

  const { data, loading, error } = useAsync(
    async () => {
      const [platform, pads, curves] = await Promise.all([fetchPlatform(program), fetchLaunchpads(program), fetchCurves(program)]);
      const meta = await fetchMetadata(connection, curves.map((c) => c.mint));
      return { platform, pads, curves, meta };
    },
    [program, connection],
    20_000
  );

  const raisedByPad = useMemo(() => {
    const m = new Map<string, bigint>();
    data?.curves.forEach((c) => {
      const k = c.launchpad.toBase58();
      m.set(k, (m.get(k) ?? 0n) + c.realSol);
    });
    return m;
  }, [data]);

  const padNames = useMemo(() => new Map(data?.pads.map((p) => [p.address.toBase58(), p.name])), [data]);
  const hot = useMemo(() => [...(data?.curves ?? [])].sort((a, b) => (b.realSol > a.realSol ? 1 : -1)).slice(0, 12), [data]);
  const totalRaised = data?.curves.reduce((s, c) => s + c.realSol, 0n) ?? 0n;

  return (
    <>
      <section className="hero">
        <span className="hero-kicker">LAUNCHPAD · INCEPTION · SOLANA</span>
        <h1>
          The launchpad that <span className="grad-text">launches launchpads</span>
        </h1>
        <p>
          Spin up your own branded token launchpad in one transaction. Set your fees, pick your curve, and earn from every
          token launched and traded on it.
        </p>
        <div className="hero-cta">
          <Link href="/create" className="btn btn-primary">
            Create your launchpad
            {data?.platform && <span className="mono">· {fmtSol(data.platform.launchpadCreationFee)} SOL</span>}
          </Link>
          <a href="#pads" className="btn btn-ghost">
            Explore launchpads
          </a>
        </div>

        <div className="layers">
          <div className="layer">
            <b className="neon-purple">LAYER 0</b>
            <h4>Solception</h4>
            <p>The platform. Takes a cut of every fee across every launchpad.</p>
          </div>
          <div className="layer">
            <b style={{ color: "var(--cyan)" }}>LAYER 1</b>
            <h4>Launchpads</h4>
            <p>Anyone deploys one with their own name, fees and bonding curve.</p>
          </div>
          <div className="layer">
            <b className="neon-green">LAYER 2</b>
            <h4>Tokens</h4>
            <p>Fair-launched on a bonding curve, graduate to a DEX when sold out.</p>
          </div>
        </div>
      </section>

      {error && <div className="error-box">Couldn&apos;t load data: {error}</div>}

      <div className="stats mt-lg">
        <Stat label="Launchpads" value={data ? data.pads.length : "—"} />
        <Stat label="Tokens launched" value={data ? data.curves.length : "—"} />
        <Stat label="SOL in curves" value={data ? fmtSol(totalRaised, 2) : "—"} />
        <Stat label="Graduated" value={data ? data.curves.filter((c) => c.complete).length : "—"} />
      </div>

      <div className="section-title" id="pads">
        <h2>Launchpads</h2>
        <Link href="/create" className="btn btn-ghost btn-sm">
          + New launchpad
        </Link>
      </div>
      {loading && !data ? (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={170} />
          ))}
        </div>
      ) : data && data.pads.length > 0 ? (
        <div className="grid">
          {data.pads.map((p) => (
            <PadCard key={p.id} pad={p} raised={raisedByPad.get(p.address.toBase58()) ?? 0n} />
          ))}
        </div>
      ) : (
        <Empty title="No launchpads yet">
          Be the first. <Link href="/create" className="neon-green">Create one →</Link>
        </Empty>
      )}

      <div className="section-title">
        <h2>Hot tokens</h2>
      </div>
      {loading && !data ? (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={170} />
          ))}
        </div>
      ) : hot.length > 0 ? (
        <div className="grid">
          {hot.map((c) => (
            <TokenCard key={c.mint.toBase58()} curve={c} meta={data?.meta.get(c.mint.toBase58())} padName={padNames.get(c.launchpad.toBase58())} />
          ))}
        </div>
      ) : (
        <Empty title="No tokens yet">Open a launchpad and launch the first token.</Empty>
      )}
    </>
  );
}
