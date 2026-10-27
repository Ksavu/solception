"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAsync, useProgram, useSend } from "@/lib/hooks";
import {
  effectiveFeeBps,
  fetchCurves,
  fetchLaunchpad,
  fetchMetadata,
  fetchPlatform,
  launchTokenTx,
} from "@/lib/solception";
import { minusSlippage, quoteBuy } from "@/lib/math";
import { fmtSol, fmtTokens, parseUnits } from "@/lib/format";
import { Addr, Avatar, Empty, Skeleton, Stat, TokenCard } from "@/components/ui";

export default function PadPage() {
  const { id } = useParams<{ id: string }>();
  const padId = Number(id);
  const program = useProgram();
  const { connection } = useConnection();

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [platform, pad] = await Promise.all([fetchPlatform(program), fetchLaunchpad(program, padId)]);
      if (!pad) return { platform, pad: null, curves: [], meta: new Map() };
      const curves = await fetchCurves(program, pad.address);
      const meta = await fetchMetadata(connection, curves.map((c) => c.mint));
      return { platform, pad, curves, meta };
    },
    [program, connection, padId],
    20_000
  );

  if (loading && !data) return <Skeleton h={420} />;
  if (error) return <div className="error-box">{error}</div>;
  if (!data?.pad || !data.platform) return <Empty title="Launchpad not found">There is no launchpad #{id} on this cluster.</Empty>;

  const { pad, platform, curves, meta } = data;
  const raised = curves.reduce((s, c) => s + c.realSol, 0n);
  const fees = curves.reduce((s, c) => s + c.launchpadFees, 0n);

  return (
    <>
      <div className="card pad-hero">
        <Avatar seed={pad.address.toBase58()} label={pad.name} size={84} />
        <div className="grow min0">
          <div className="muted tiny mono">LAUNCHPAD #{pad.id}</div>
          <h1 className="truncate">{pad.name}</h1>
          <div className="chips">
            <span className="badge badge-purple">{effectiveFeeBps(pad, platform) / 100}% trade fee</span>
            <span className="badge badge-green">{pad.creatorFeeShareBps / 100}% to creators</span>
            <span className="badge badge-purple">{fmtSol(pad.tokenLaunchFee)} SOL to launch</span>
            {pad.paused && <span className="badge badge-warn">Paused</span>}
          </div>
        </div>
        <div className="kv small" style={{ minWidth: 220 }}>
          <div>
            <span>Owner</span>
            <Addr value={pad.owner} />
          </div>
          <div>
            <span>Address</span>
            <Addr value={pad.address} />
          </div>
          {pad.uri && (
            <div>
              <span>Website</span>
              <a className="addr" href={pad.uri} target="_blank" rel="noreferrer">
                {pad.uri.replace(/^https?:\/\//, "").slice(0, 24)}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="stats mt">
        <Stat label="Tokens" value={curves.length} />
        <Stat label="SOL raised" value={fmtSol(raised, 2)} />
        <Stat label="Graduated" value={curves.filter((c) => c.complete).length} />
        <Stat label="Unclaimed pad fees" value={fmtSol(fees)} sub="SOL" />
      </div>

      <div className="split mt-lg">
        <div>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Tokens</h2>
          </div>
          {curves.length ? (
            <div className="grid">
              {curves.map((c) => (
                <TokenCard key={c.mint.toBase58()} curve={c} meta={meta.get(c.mint.toBase58())} />
              ))}
            </div>
          ) : (
            <Empty title="No tokens yet">Launch the first token on {pad.name}.</Empty>
          )}
        </div>
        <LaunchForm pad={pad} platform={platform} onLaunched={reload} />
      </div>
    </>
  );
}

function LaunchForm({
  pad,
  platform,
  onLaunched,
}: {
  pad: NonNullable<Awaited<ReturnType<typeof fetchLaunchpad>>>;
  platform: NonNullable<Awaited<ReturnType<typeof fetchPlatform>>>;
  onLaunched: () => void;
}) {
  const program = useProgram();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { send, busy } = useSend();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [image, setImage] = useState("");
  const [customUri, setCustomUri] = useState("");
  const [devBuy, setDevBuy] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const builtUri = image
    ? `${origin}/api/meta?n=${encodeURIComponent(name)}&s=${encodeURIComponent(symbol)}&i=${encodeURIComponent(image)}`
    : `${origin}/api/meta?n=${encodeURIComponent(name)}&s=${encodeURIComponent(symbol)}`;
  const uri = customUri.trim() || builtUri;

  const devBuyLamports = devBuy ? parseUnits(devBuy, 9) : 0n;
  const devQuote =
    devBuyLamports && devBuyLamports > 0n
      ? quoteBuy(
          { vs: pad.curve.initialVirtualSol, vt: pad.curve.initialVirtualTokens, realSol: 0n, realTokens: pad.curve.curveTokenSupply },
          devBuyLamports,
          effectiveFeeBps(pad, platform)
        )
      : null;

  const errs: string[] = [];
  if (name.length > 32) errs.push("Name max 32 characters");
  if (symbol.length > 10) errs.push("Symbol max 10 characters");
  if (uri.length > 200) errs.push("Metadata URL is over 200 characters. Use a shorter image link or your own metadata URI.");
  if (image && !/^https?:\/\//.test(image)) errs.push("Image must be an http(s) URL");
  if (devBuyLamports === null) errs.push("Invalid initial buy amount");

  const valid = name.trim() && symbol.trim() && errs.length === 0;
  const blocked = pad.paused || platform.paused;

  const submit = async () => {
    if (!publicKey || !valid) return;
    const { tx, mint } = await launchTokenTx(
      program,
      publicKey,
      pad.address,
      { name: name.trim(), symbol: symbol.trim().toUpperCase(), uri },
      devQuote && devBuyLamports ? { maxSolCost: devBuyLamports, minTokensOut: minusSlippage(devQuote.tokensOut, 1) } : undefined
    );
    const sig = await send(`$${symbol.trim().toUpperCase()} launched`, tx, [mint]);
    if (sig) {
      onLaunched();
      router.push(`/token/${mint.publicKey.toBase58()}`);
    }
  };

  return (
    <div className="card trade-panel">
      <h3>
        Launch a token on <span className="grad-text">{pad.name}</span>
      </h3>
      <div className="form">
        <div className="two">
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ception Cat" maxLength={32} />
          </div>
          <div className="field">
            <label>Symbol</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="CAT" maxLength={10} />
          </div>
        </div>
        <div className="field">
          <label>Image URL</label>
          <input value={image} onChange={(e) => setImage(e.target.value.trim())} placeholder="https://…/logo.png" />
          <span className="hint">Direct link to a PNG/JPG/GIF. Shorter links are better.</span>
        </div>
        <details>
          <summary>Use my own metadata URI</summary>
          <div className="field">
            <input value={customUri} onChange={(e) => setCustomUri(e.target.value.trim())} placeholder="https://… or ipfs gateway JSON" />
            <span className="hint">Metaplex JSON with name, symbol, image, description.</span>
          </div>
        </details>
        <div className="field">
          <label>Initial buy (SOL, optional)</label>
          <input value={devBuy} onChange={(e) => setDevBuy(e.target.value.replace(",", "."))} placeholder="0.0" inputMode="decimal" />
          {devQuote && <span className="hint neon-green">≈ {fmtTokens(devQuote.tokensOut)} tokens, first in line</span>}
        </div>
        {errs.map((e) => (
          <span key={e} className="err tiny" style={{ color: "var(--pink)" }}>
            {e}
          </span>
        ))}
        <div className="kv small">
          <div>
            <span>Launch fee</span>
            <span className="mono">{fmtSol(pad.tokenLaunchFee)} SOL</span>
          </div>
          <div>
            <span>Supply</span>
            <span className="mono">{fmtTokens(pad.curve.curveTokenSupply + pad.curve.lpTokenReserve)} (fixed)</span>
          </div>
          <div>
            <span>Mint & freeze</span>
            <span className="mono neon-green">revoked</span>
          </div>
        </div>
        <button className="btn btn-primary btn-block" disabled={!publicKey || !valid || busy || blocked} onClick={submit}>
          {!publicKey ? "Connect wallet" : blocked ? "Launches paused" : busy ? "Launching…" : "🚀 Launch token"}
        </button>
      </div>
    </div>
  );
}
