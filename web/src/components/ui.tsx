"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { PublicKey } from "@solana/web3.js";
import { fetchImage, curveProgress, type Curve, type Launchpad, type TokenMeta } from "@/lib/solception";
import { priceSol } from "@/lib/math";
import { fmtNum, fmtSol, hashHue, short, timeAgo } from "@/lib/format";
import { explorerUrl } from "@/lib/config";

export function Avatar({ seed, src, size = 48, label }: { seed: string; src?: string | null; size?: number; label?: string }) {
  const [h1, h2] = hashHue(seed);
  const [ok, setOk] = useState(true);
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from ${h1}deg, hsl(${h1} 95% 60%), hsl(${h2} 95% 55%), #9945ff, #14f195, hsl(${h1} 95% 60%))`,
        fontSize: size * 0.38,
      }}
    >
      {src && ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setOk(false)} />
      ) : (
        <span>{(label || "?").slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

export function useTokenImage(meta?: TokenMeta) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (meta?.uri) fetchImage(meta.uri).then((x) => live && setImg(x));
    return () => {
      live = false;
    };
  }, [meta?.uri]);
  return img;
}

export function Progress({ value, glow = true }: { value: number; glow?: boolean }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`progress ${glow ? "glow" : ""}`}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Addr({ value, n = 4 }: { value: PublicKey | string; n?: number }) {
  const s = typeof value === "string" ? value : value.toBase58();
  return (
    <a className="addr" href={explorerUrl(s)} target="_blank" rel="noreferrer" title={s}>
      {short(s, n)}
    </a>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-orb" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Skeleton({ h = 120 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />;
}

export function PadCard({ pad, raised }: { pad: Launchpad; raised?: bigint }) {
  return (
    <Link href={`/pad/${pad.id}`} className="card card-hover pad-card">
      <div className="row gap">
        <Avatar seed={pad.address.toBase58()} label={pad.name} size={52} />
        <div className="grow min0">
          <div className="card-title truncate">{pad.name}</div>
          <div className="muted small">
            Pad #{pad.id} · by {short(pad.owner)}
          </div>
        </div>
        {pad.paused && <span className="badge badge-warn">Paused</span>}
      </div>
      <div className="pad-stats">
        <div>
          <span>{pad.tokenCount}</span>
          <label>tokens</label>
        </div>
        <div>
          <span>{pad.tradeFeeBps / 100}%</span>
          <label>trade fee</label>
        </div>
        <div>
          <span>{raised !== undefined ? fmtSol(raised, 2) : "—"}</span>
          <label>SOL raised</label>
        </div>
      </div>
    </Link>
  );
}

export function TokenCard({ curve, meta, padName }: { curve: Curve; meta?: TokenMeta; padName?: string }) {
  const img = useTokenImage(meta);
  const price = priceSol(curve.vs, curve.vt);
  const mcap = price * (Number(curve.totalSupply) / 1e6);
  const prog = curveProgress(curve);
  return (
    <Link href={`/token/${curve.mint.toBase58()}`} className="card card-hover token-card">
      <div className="row gap">
        <Avatar seed={curve.mint.toBase58()} src={img} label={meta?.symbol || meta?.name} size={56} />
        <div className="grow min0">
          <div className="card-title truncate">{meta?.name || short(curve.mint)}</div>
          <div className="muted small">
            ${meta?.symbol || "???"} {padName && <>· {padName}</>}
          </div>
        </div>
        {curve.complete ? <span className="badge badge-green">Graduated</span> : <span className="muted tiny">{timeAgo(curve.createdAt)}</span>}
      </div>
      <div className="row between small mt">
        <span className="muted">Market cap</span>
        <span className="mono neon-green">{fmtNum(mcap)} SOL</span>
      </div>
      <Progress value={prog} />
      <div className="row between tiny muted">
        <span>Bonding curve</span>
        <span className="mono">{(prog * 100).toFixed(1)}%</span>
      </div>
    </Link>
  );
}
