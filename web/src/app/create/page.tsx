"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useAsync, useProgram, useSend } from "@/lib/hooks";
import { DEFAULT_CURVE, createLaunchpadTx, fetchPlatform, type CurveConfig } from "@/lib/solception";
import { solInForTokens } from "@/lib/math";
import { fmtSol, parseUnits, short } from "@/lib/format";
import { Avatar, Skeleton } from "@/components/ui";

const isKey = (s: string) => {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
};

export default function CreatePage() {
  const program = useProgram();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { send, busy } = useSend();
  const { data: platform, loading } = useAsync(() => fetchPlatform(program), [program]);

  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [feePct, setFeePct] = useState("1");
  const [creatorPct, setCreatorPct] = useState("30");
  const [launchFee, setLaunchFee] = useState("0.02");
  const [recipient, setRecipient] = useState("");
  const [virtSol, setVirtSol] = useState("30");
  const [curveTokensM, setCurveTokensM] = useState("793.1");

  useEffect(() => {
    if (publicKey && !recipient) setRecipient(publicKey.toBase58());
  }, [publicKey, recipient]);

  const maxFeePct = (platform?.maxTradeFeeBps ?? 200) / 100;
  const feeBps = Math.round(parseFloat(feePct || "0") * 100);
  const creatorBps = Math.round(parseFloat(creatorPct || "0") * 100);
  const launchFeeLamports = parseUnits(launchFee || "0", 9);

  const curve: CurveConfig | null = useMemo(() => {
    const vs = parseUnits(virtSol || "0", 9);
    const sold = parseUnits(curveTokensM || "0", 6);
    if (!vs || !sold || vs <= 0n) return null;
    const curveTokenSupply = sold * 1_000_000n;
    if (curveTokenSupply >= 1_000_000_000_000_000n) return null;
    // keep pump.fun shape: 1B total supply, virtual tokens = 1.073B
    return {
      initialVirtualSol: vs,
      initialVirtualTokens: DEFAULT_CURVE.initialVirtualTokens,
      curveTokenSupply,
      lpTokenReserve: 1_000_000_000_000_000n - curveTokenSupply,
    };
  }, [virtSol, curveTokensM]);

  const raiseTarget = curve ? solInForTokens(curve.initialVirtualSol, curve.initialVirtualTokens, curve.curveTokenSupply) : null;

  const errors: Record<string, string> = {};
  if (name && name.length > 32) errors.name = "Max 32 characters";
  if (uri.length > 200) errors.uri = "Max 200 characters";
  if (feeBps < 0 || feeBps > (platform?.maxTradeFeeBps ?? 200)) errors.fee = `0 – ${maxFeePct}%`;
  if (creatorBps < 0 || creatorBps > 10000) errors.creator = "0 – 100%";
  if (launchFeeLamports === null) errors.launchFee = "Invalid amount";
  if (recipient && !isKey(recipient)) errors.recipient = "Not a valid address";
  if (!curve || raiseTarget === null) errors.curve = "Invalid curve settings";

  const valid = name.trim().length > 0 && Object.keys(errors).length === 0 && isKey(recipient);

  // Platform share is taken first, then creator share of the rest.
  const share = platform?.platformFeeShareBps ?? 2500;
  const youPct = (feeBps / 100) * (1 - share / 10000) * (1 - creatorBps / 10000);
  const creatorEarn = (feeBps / 100) * (1 - share / 10000) * (creatorBps / 10000);

  const submit = async () => {
    if (!publicKey || !platform || !curve || !valid) return;
    const { tx, id } = await createLaunchpadTx(program, publicKey, platform, {
      name: name.trim(),
      uri: uri.trim(),
      feeRecipient: new PublicKey(recipient),
      tradeFeeBps: feeBps,
      creatorFeeShareBps: creatorBps,
      tokenLaunchFee: launchFeeLamports ?? 0n,
      curve,
    });
    const sig = await send(`Launchpad "${name.trim()}" created`, tx);
    if (sig) router.push(`/pad/${id}`);
  };

  if (loading) return <Skeleton h={500} />;
  if (!platform) return <div className="error-box">Platform is not initialized on this cluster yet.</div>;

  return (
    <>
      <div className="section-title" style={{ marginTop: 10 }}>
        <h2>Create your launchpad</h2>
      </div>
      <div className="split">
        <div className="card">
          <div className="form">
            <div className="field">
              <label>
                Launchpad name <span>{name.length}/32</span>
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DegenPad" maxLength={32} />
              {errors.name && <span className="err">{errors.name}</span>}
            </div>
            <div className="field">
              <label>Website / branding URL (optional)</label>
              <input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://yourpad.xyz" />
              {errors.uri && <span className="err">{errors.uri}</span>}
            </div>

            <div className="two">
              <div className="field">
                <label>
                  Trade fee <span className="mono">max {maxFeePct}%</span>
                </label>
                <input type="range" min={0} max={maxFeePct} step={0.05} value={feePct} onChange={(e) => setFeePct(e.target.value)} />
                <span className="mono neon-green">{feePct}% per buy/sell</span>
                {errors.fee && <span className="err">{errors.fee}</span>}
              </div>
              <div className="field">
                <label>Token creator share</label>
                <input type="range" min={0} max={100} step={5} value={creatorPct} onChange={(e) => setCreatorPct(e.target.value)} />
                <span className="mono" style={{ color: "var(--cyan)" }}>
                  {creatorPct}% of your fees to creators
                </span>
              </div>
            </div>

            <div className="two">
              <div className="field">
                <label>Token launch fee (SOL)</label>
                <input value={launchFee} onChange={(e) => setLaunchFee(e.target.value)} inputMode="decimal" />
                {errors.launchFee && <span className="err">{errors.launchFee}</span>}
              </div>
              <div className="field">
                <label>Fee recipient</label>
                <input value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="Wallet address" className="mono" />
                {errors.recipient && <span className="err">{errors.recipient}</span>}
              </div>
            </div>

            <details>
              <summary>Advanced: bonding curve</summary>
              <div className="two">
                <div className="field">
                  <label>Virtual SOL reserve</label>
                  <input value={virtSol} onChange={(e) => setVirtSol(e.target.value)} inputMode="decimal" />
                  <span className="hint">Higher = higher starting price</span>
                </div>
                <div className="field">
                  <label>Tokens sold on curve (millions of 1B)</label>
                  <input value={curveTokensM} onChange={(e) => setCurveTokensM(e.target.value)} inputMode="decimal" />
                  <span className="hint">Rest goes to DEX liquidity at graduation</span>
                </div>
              </div>
              {errors.curve && <span className="err">{errors.curve}</span>}
            </details>

            <button className="btn btn-primary btn-block" disabled={!publicKey || !valid || busy} onClick={submit}>
              {!publicKey ? "Connect wallet" : busy ? "Creating…" : `Create launchpad · ${fmtSol(platform.launchpadCreationFee)} SOL`}
            </button>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="muted tiny">PREVIEW</div>
            <div className="row gap">
              <Avatar seed={name || "solception"} label={name || "?"} size={64} />
              <div className="min0">
                <div className="card-title truncate">{name || "Your launchpad"}</div>
                <div className="muted small">Pad #{platform.launchpadCount}</div>
              </div>
            </div>
            <div className="kv mt">
              <div>
                <span>Trade fee</span>
                <span className="mono">{feePct}%</span>
              </div>
              <div>
                <span>You earn per trade</span>
                <span className="mono neon-green">{youPct.toFixed(3)}% of volume</span>
              </div>
              <div>
                <span>Creators earn</span>
                <span className="mono">{creatorEarn.toFixed(3)}%</span>
              </div>
              <div>
                <span>Platform share</span>
                <span className="mono">{share / 100}% of fees</span>
              </div>
              <div>
                <span>Launch fee</span>
                <span className="mono">{launchFee || 0} SOL</span>
              </div>
              <div>
                <span>Graduates at</span>
                <span className="mono">{raiseTarget !== null ? `~${fmtSol(raiseTarget, 1)} SOL raised` : "—"}</span>
              </div>
              <div>
                <span>Fees go to</span>
                <span className="mono">{recipient && isKey(recipient) ? short(recipient) : "—"}</span>
              </div>
            </div>
          </div>
          <div className="note">
            Creating costs {fmtSol(platform.launchpadCreationFee)} SOL plus a small rent deposit. You can change fees and branding later.
          </div>
        </div>
      </div>
    </>
  );
}
