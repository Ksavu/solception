"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAsync, useProgram, useSend } from "@/lib/hooks";
import { claimTxs, fetchCurves, fetchLaunchpads, fetchMetadata, fetchPlatform, type Curve, type FeeBucket } from "@/lib/solception";
import { fmtSol, short } from "@/lib/format";
import { Addr, Avatar, Empty, Skeleton, Stat } from "@/components/ui";
import type { PublicKey } from "@solana/web3.js";

export default function Dashboard() {
  const program = useProgram();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { send, busy } = useSend();

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [platform, pads, curves] = await Promise.all([fetchPlatform(program), fetchLaunchpads(program), fetchCurves(program)]);
      const meta = await fetchMetadata(connection, curves.map((c) => c.mint));
      return { platform, pads, curves, meta };
    },
    [program, connection],
    30_000
  );

  const me = publicKey?.toBase58();
  const view = useMemo(() => {
    if (!data || !me) return null;
    const myPads = data.pads.filter((p) => p.owner.toBase58() === me || p.feeRecipient.toBase58() === me);
    const padCurves = (pad: PublicKey) => data.curves.filter((c) => c.launchpad.equals(pad));
    const myCreated = data.curves.filter((c) => c.creator.toBase58() === me);
    const isPlatform =
      !!data.platform && (data.platform.authority.toBase58() === me || data.platform.treasury.toBase58() === me);
    return { myPads, padCurves, myCreated, isPlatform };
  }, [data, me]);

  const claim = async (label: string, items: { curve: Curve; bucket: FeeBucket; recipient: PublicKey }[]) => {
    const withFees = items.filter((x) => (x.bucket === "platform" ? x.curve.platformFees : x.bucket === "launchpad" ? x.curve.launchpadFees : x.curve.creatorFees) > 0n);
    if (!withFees.length) return;
    const txs = await claimTxs(program, withFees);
    if (await send(label, txs)) reload();
  };

  if (!publicKey) return <Empty title="Connect your wallet">See your launchpads, tokens and claimable fees.</Empty>;
  if (loading && !data) return <Skeleton h={400} />;
  if (error) return <div className="error-box">{error}</div>;
  if (!data || !view) return null;

  const platformTotal = data.curves.reduce((s, c) => s + c.platformFees, 0n);
  const creatorTotal = view.myCreated.reduce((s, c) => s + c.creatorFees, 0n);
  const padTotal = view.myPads.reduce((s, p) => s + view.padCurves(p.address).reduce((a, c) => a + c.launchpadFees, 0n), 0n);

  return (
    <>
      <div className="section-title" style={{ marginTop: 10 }}>
        <h2>Dashboard</h2>
        <span className="mono muted small">{short(publicKey, 6)}</span>
      </div>

      <div className="stats">
        <Stat label="Launchpad fees" value={fmtSol(padTotal, 6)} sub="SOL unclaimed" />
        <Stat label="Creator rewards" value={fmtSol(creatorTotal, 6)} sub="SOL unclaimed" />
        {view.isPlatform && <Stat label="Platform fees" value={fmtSol(platformTotal, 6)} sub="SOL unclaimed" />}
        <Stat label="Your launchpads" value={view.myPads.length} />
      </div>

      {view.isPlatform && data.platform && (
        <>
          <div className="section-title">
            <h2>Platform (Layer 0)</h2>
          </div>
          <div className="card">
            <div className="row between">
              <div>
                <div className="muted small">Accrued across {data.curves.length} tokens on {data.pads.length} launchpads</div>
                <div className="stat-value neon-green">{fmtSol(platformTotal, 6)} SOL</div>
                <div className="muted tiny">
                  Paid to treasury <Addr value={data.platform.treasury} /> · creation fees are paid instantly
                </div>
              </div>
              <button
                className="btn btn-primary"
                disabled={busy || platformTotal === 0n}
                onClick={() =>
                  claim(
                    "Platform fees claimed",
                    data.curves.map((c) => ({ curve: c, bucket: "platform" as const, recipient: data.platform!.treasury }))
                  )
                }
              >
                Claim all
              </button>
            </div>
            <div className="kv small mt">
              <div>
                <span>Launchpad creation fee</span>
                <span className="mono">{fmtSol(data.platform.launchpadCreationFee)} SOL</span>
              </div>
              <div>
                <span>Platform fee share</span>
                <span className="mono">{data.platform.platformFeeShareBps / 100}%</span>
              </div>
              <div>
                <span>Max trade fee</span>
                <span className="mono">{data.platform.maxTradeFeeBps / 100}%</span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="section-title">
        <h2>Your launchpads</h2>
        <Link href="/create" className="btn btn-ghost btn-sm">
          + New
        </Link>
      </div>
      {view.myPads.length ? (
        <div className="stack">
          {view.myPads.map((p) => {
            const curves = view.padCurves(p.address);
            const owed = curves.reduce((s, c) => s + c.launchpadFees, 0n);
            return (
              <div key={p.id} className="card">
                <div className="row gap">
                  <Avatar seed={p.address.toBase58()} label={p.name} size={46} />
                  <div className="grow min0">
                    <Link href={`/pad/${p.id}`} className="card-title">
                      {p.name}
                    </Link>
                    <div className="muted small">
                      {curves.length} tokens · {p.tradeFeeBps / 100}% fee · fees to {short(p.feeRecipient)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono neon-green">{fmtSol(owed, 6)} SOL</div>
                    <button
                      className="btn btn-ghost btn-sm mt"
                      disabled={busy || owed === 0n}
                      onClick={() =>
                        claim(
                          `${p.name} fees claimed`,
                          curves.map((c) => ({ curve: c, bucket: "launchpad" as const, recipient: p.feeRecipient }))
                        )
                      }
                    >
                      Claim
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty title="You don't own a launchpad yet">
          <Link href="/create" className="neon-green">
            Create one →
          </Link>
        </Empty>
      )}

      <div className="section-title">
        <h2>Tokens you created</h2>
        {creatorTotal > 0n && (
          <button
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() =>
              claim(
                "Creator rewards claimed",
                view.myCreated.map((c) => ({ curve: c, bucket: "creator" as const, recipient: c.creator }))
              )
            }
          >
            Claim all
          </button>
        )}
      </div>
      {view.myCreated.length ? (
        <div className="card table-wrap">
          <table className="trades">
            <thead>
              <tr>
                <th>Token</th>
                <th>In curve</th>
                <th>Rewards</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {view.myCreated.map((c) => {
                const m = data.meta.get(c.mint.toBase58());
                return (
                  <tr key={c.mint.toBase58()}>
                    <td>
                      <Link href={`/token/${c.mint.toBase58()}`} className="neon-purple">
                        {m?.symbol ? `$${m.symbol}` : short(c.mint)}
                      </Link>
                    </td>
                    <td>{fmtSol(c.realSol, 3)} SOL</td>
                    <td className="neon-green">{fmtSol(c.creatorFees, 6)}</td>
                    <td>{c.complete ? "Graduated" : "Live"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="muted small">You haven&apos;t launched any tokens yet.</div>
      )}
    </>
  );
}
