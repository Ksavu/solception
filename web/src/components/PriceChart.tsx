"use client";

import { useMemo, useState } from "react";
import type { TradeEvent } from "@/lib/solception";
import { priceSol } from "@/lib/math";
import { fmtPrice } from "@/lib/format";

interface Pt {
  t: number;
  p: number;
}

export default function PriceChart({ trades, startPrice, currentPrice }: { trades: TradeEvent[]; startPrice: number; currentPrice: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = 280;
  const PAD = 8;

  const pts: Pt[] = useMemo(() => {
    const series = trades.map((t) => ({ t: t.timestamp, p: priceSol(t.vs, t.vt) }));
    const first = series[0]?.t ?? Math.floor(Date.now() / 1000) - 60;
    return [{ t: first - 1, p: startPrice }, ...series, { t: Math.floor(Date.now() / 1000), p: currentPrice }];
  }, [trades, startPrice, currentPrice]);

  const { path, area, xs, ys, min, max } = useMemo(() => {
    const ps = pts.map((x) => x.p);
    let min = Math.min(...ps);
    let max = Math.max(...ps);
    if (max === min) {
      max *= 1.05;
      min *= 0.95;
    }
    const n = pts.length;
    const xs = pts.map((_, i) => PAD + (i / Math.max(1, n - 1)) * (W - PAD * 2));
    const ys = pts.map((x) => H - PAD - ((x.p - min) / (max - min)) * (H - PAD * 2));
    // step line: price holds until the next trade
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 1; i < n; i++) d += ` H ${xs[i]} V ${ys[i]}`;
    const area = `${d} V ${H} H ${xs[0]} Z`;
    return { path: d, area, xs, ys, min, max };
  }, [pts]);

  const up = currentPrice >= startPrice;
  const hi = hover ?? pts.length - 1;

  return (
    <div className="chart">
      <div className="chart-head">
        <div>
          <div className="muted tiny">Price (SOL)</div>
          <div className="chart-price mono">{fmtPrice(pts[hi].p)}</div>
        </div>
        <div className={`chart-change mono ${up ? "neon-green" : "neon-pink"}`}>
          {up ? "▲" : "▼"} {(((currentPrice - startPrice) / startPrice) * 100).toFixed(2)}%
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          xs.forEach((v, i) => {
            if (Math.abs(v - x) < Math.abs(xs[best] - x)) best = i;
          });
          setHover(best);
        }}
      >
        <defs>
          <linearGradient id="chartLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#9945ff" />
            <stop offset="100%" stopColor="#14f195" />
          </linearGradient>
          <linearGradient id="chartArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14f195" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#9945ff" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="chart-grid" />
        ))}
        <path d={area} fill="url(#chartArea)" />
        <path d={path} fill="none" stroke="url(#chartLine)" strokeWidth="2.5" filter="url(#glow)" vectorEffect="non-scaling-stroke" />
        <line x1={xs[hi]} x2={xs[hi]} y1="0" y2={H} className="chart-cursor" />
        <circle cx={xs[hi]} cy={ys[hi]} r="5" className="chart-dot" />
      </svg>
      <div className="chart-foot tiny muted mono">
        <span>low {fmtPrice(min)}</span>
        <span>{trades.length} trades</span>
        <span>high {fmtPrice(max)}</span>
      </div>
    </div>
  );
}
