"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useAsync, useProgram, useSend } from "@/lib/hooks";
import {
  claimTxs,
  curveProgress,
  fetchCurve,
  fetchLaunchpadByAddress,
  fetchMetadata,
  fetchPlatform,
  fetchTrades,
} from "@/lib/solception";
import { priceSol, solInForTokens } from "@/lib/math";
import { fmtNum, fmtPrice, fmtSol, fmtTokens, short, timeAgo } from "@/lib/format";
import { explorerUrl } from "@/lib/config";
import { Addr, Avatar, Empty, Progress, Skeleton, Stat, useTokenImage } from "@/components/ui";
import PriceChart from "@/components/PriceChart";
import TradePanel from "@/components/TradePanel";

function parseKey(s: string) {
  try {
    return new PublicKey(s);
  } catch {
    return null;
  }
}

export default function TokenPage() {
  const { mint: mintStr } = useParams<{ mint: string }>();
  const mint = useMemo(() => parseKey(mintStr), [mintStr]);
  const program = useProgram();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { send, busy } = useSend();

  const { data, loading, error, reload } = useAsync(
    async () => {
      if (!mint) return null;
      const [platform, curve, meta] = await Promise.all([
        fetchPlatform(program),
        fetchCurve(program, mint),
        fetchMetadata(connection, [mint]),
      ]);
      if (!curve || !platform) return null;
      const pad = await fetchLaunchpadByAddress(program, curve.launchpad);
      return { platform, curve, pad, meta: meta.get(mint.toBase58()) };
    },
    [program, connection, mintStr],
    10_000
  );

  const trades = useAsync(
    async () => (data?.curve ? fetchTrades(program, data.curve.address) : []),
    [program, data?.curve?.address.toBase58(), data?.curve?.realSol.toString()]
  );

  const img = useTokenImage(data?.meta);

  if (!mint) return <Empty title="Invalid token address" />;
  if (loading && !data) return <Skeleton h={500} />;
  if (error) return <div className="error-box">{error}</div>;
  if (!data || !data.pad) return <Empty title="Token not found">This mint was not launched through Solception.</Empty>;

  const { curve, pad, platform, meta } = data;
  const name = meta?.name || short(curve.mint);
  const symbol = meta?.symbol || "TOKEN";
  const price = priceSol(curve.vs, curve.vt);
  const startPrice = priceSol(pad.curve.initialVirtualSol, pad.curve.initialVirtualTokens);
  const mcap = price * (Number(curve.totalSupply) / 1e6);
  const prog = curveProgress(curve);
  const target =
    solInForTokens(pad.curve.initialVirtualSol, pad.curve.initialVirtualTokens, curve.totalSupply - curve.lpReserve) ?? 0n;
  const isCreator = publicKey?.equals(curve.creator);

  const claimCreator = async () => {
    const txs = await claimTxs(program, [{ curve, bucket: "creator", recipient: curve.creator }]);
    if (await send("Creator fees claimed", txs)) reload();
  };

  return (
    <>
      <div className="token-head">
        <Avatar seed={curve.mint.toBase58()} src={img} label={symbol} size={72} />
        <div className="grow min0">
          <h1 className="truncate">{name}</h1>
          <div className="row gap small">
            <span className="sym">${symbol}</span>
            <Addr value={curve.mint} n={6} />
            <span className="muted">
              on{" "}
              <Link href={`/pad/${pad.id}`} className="neon-purple">
                {pad.name}
              </Link>
            </span>
          </div>
        </div>
        {curve.complete && <span className="badge badge-green">🎓 Graduated</span>}
      </div>

      <div className="stats mt">
        <Stat label="Price" value={fmtPrice(price)} sub="SOL per token" />
        <Stat label="Market cap" value={`${fmtNum(mcap)}`} sub="SOL" />
        <Stat label="In curve" value={fmtSol(curve.realSol, 2)} sub={`of ~${fmtSol(target, 0)} SOL`} />
        <Stat label="Created" value={timeAgo(curve.createdAt)} sub={<>by {short(curve.creator)}</>} />
      </div>

      {curve.complete && (
        <div className="banner banner-green mt">
          🎓 The bonding curve is complete.{" "}
          {curve.migrated ? "Liquidity has been migrated to the DEX." : "Liquidity is being migrated to the DEX."}
        </div>
      )}

      <div className="split mt">
        <div className="stack">
          <div className="card">
            <PriceChart trades={trades.data ?? []} startPrice={startPrice} currentPrice={price} />
          </div>

          <div className="card">
            <div className="row between">
              <h3>Bonding curve progress</h3>
              <span className="mono neon-green">{(prog * 100).toFixed(2)}%</span>
            </div>
            <Progress value={prog} />
            <div className="muted small">
              {curve.complete
                ? "Sold out."
                : `${fmtTokens(curve.realTokens)} tokens left on the curve. When they are gone, ${fmtTokens(
                    curve.lpReserve
                  )} tokens and the raised SOL seed a DEX pool.`}
            </div>
          </div>

          <div className="card">
            <h3>Recent trades</h3>
            {trades.loading && !trades.data ? (
              <Skeleton h={120} />
            ) : trades.data && trades.data.length ? (
              <div className="table-wrap">
                <table className="trades">
                  <thead>
                    <tr>
                      <th>Side</th>
                      <th>Account</th>
                      <th>SOL</th>
                      <th>${symbol}</th>
                      <th>Time</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trades.data].reverse().slice(0, 25).map((t) => (
                      <tr key={t.signature + t.tokenAmount.toString()}>
                        <td className={t.isBuy ? "side-buy" : "side-sell"}>{t.isBuy ? "BUY" : "SELL"}</td>
                        <td>{short(t.user)}</td>
                        <td>{fmtSol(t.solAmount)}</td>
                        <td>{fmtTokens(t.tokenAmount)}</td>
                        <td className="muted">{timeAgo(t.timestamp)}</td>
                        <td>
                          <a href={explorerUrl(t.signature, "tx")} target="_blank" rel="noreferrer" className="addr">
                            ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="muted small">No trades yet. Be the first buyer.</div>
            )}
          </div>
        </div>

        <div className="stack">
          <TradePanel curve={curve} pad={pad} platform={platform} symbol={symbol} onDone={reload} />

          <div className="card">
            <h3>Token info</h3>
            <div className="kv">
              <div>
                <span>Total supply</span>
                <span className="mono">{fmtTokens(curve.totalSupply)}</span>
              </div>
              <div>
                <span>Trade fee</span>
                <span className="mono">{Math.min(pad.tradeFeeBps, platform.maxTradeFeeBps) / 100}%</span>
              </div>
              <div>
                <span>Mint authority</span>
                <span className="mono neon-green">revoked</span>
              </div>
              <div>
                <span>Freeze authority</span>
                <span className="mono neon-green">revoked</span>
              </div>
              <div>
                <span>Creator</span>
                <Addr value={curve.creator} />
              </div>
              <div>
                <span>Curve account</span>
                <Addr value={curve.address} />
              </div>
            </div>
          </div>

          {isCreator && (
            <div className="card">
              <h3>Your creator rewards</h3>
              <div className="row between">
                <span className="muted">Unclaimed</span>
                <span className="mono neon-green">{fmtSol(curve.creatorFees, 6)} SOL</span>
              </div>
              <button className="btn btn-ghost" disabled={busy || curve.creatorFees === 0n} onClick={claimCreator}>
                Claim
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
