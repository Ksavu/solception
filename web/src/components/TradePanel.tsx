"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { buyIx, effectiveFeeBps, sellIx, type Curve, type Launchpad, type Platform } from "@/lib/solception";
import { minusSlippage, quoteBuy, quoteSell } from "@/lib/math";
import { fmtSol, fmtTokens, parseUnits } from "@/lib/format";
import { useProgram, useSend } from "@/lib/hooks";

export default function TradePanel({
  curve,
  pad,
  platform,
  symbol,
  onDone,
}: {
  curve: Curve;
  pad: Launchpad;
  platform: Platform;
  symbol: string;
  onDone: () => void;
}) {
  const program = useProgram();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { send, busy } = useSend();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(2);
  const [solBal, setSolBal] = useState<bigint>(0n);
  const [tokBal, setTokBal] = useState<bigint>(0n);

  const feeBps = effectiveFeeBps(pad, platform);
  const state = { vs: curve.vs, vt: curve.vt, realSol: curve.realSol, realTokens: curve.realTokens };

  const loadBalances = async () => {
    if (!publicKey) return;
    const [sol, tok] = await Promise.all([
      connection.getBalance(publicKey, "confirmed"),
      connection
        .getTokenAccountBalance(getAssociatedTokenAddressSync(curve.mint, publicKey), "confirmed")
        .then((r) => BigInt(r.value.amount))
        .catch(() => 0n),
    ]);
    setSolBal(BigInt(sol));
    setTokBal(tok);
  };

  useEffect(() => {
    loadBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, curve.realSol, curve.realTokens]);

  const parsed = parseUnits(amount, side === "buy" ? 9 : 6);

  const quote = useMemo(() => {
    if (!parsed || parsed <= 0n) return null;
    return side === "buy" ? { buy: quoteBuy(state, parsed, feeBps) } : { sell: quoteSell(state, parsed, feeBps) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, side, curve.vs, curve.vt, feeBps]);

  const insufficient =
    !!publicKey && !!parsed && (side === "buy" ? parsed + 5_000_000n > solBal : parsed > tokBal);

  const submit = async () => {
    if (!publicKey || !parsed || !quote) return;
    let ix;
    if (side === "buy" && quote.buy) {
      ix = await buyIx(program, publicKey, pad.address, curve.mint, parsed, minusSlippage(quote.buy.tokensOut, slippage));
    } else if (quote.sell) {
      ix = await sellIx(program, publicKey, pad.address, curve.mint, parsed, minusSlippage(quote.sell.net, slippage));
    }
    if (!ix) return;
    const sig = await send(side === "buy" ? `Bought $${symbol}` : `Sold $${symbol}`, new Transaction().add(ix));
    if (sig) {
      setAmount("");
      onDone();
      loadBalances();
    }
  };

  const presets = side === "buy" ? ["0.1", "0.5", "1", "5"] : ["25%", "50%", "75%", "100%"];
  const applyPreset = (p: string) => {
    if (side === "buy") return setAmount(p);
    const pct = BigInt(parseInt(p));
    const v = (tokBal * pct) / 100n;
    setAmount((Number(v) / 1e6).toString());
  };

  const disabled = curve.complete || busy || !publicKey || !quote || insufficient || (side === "buy" && pad.paused) || (side === "buy" && platform.paused);

  let cta = side === "buy" ? `Buy $${symbol}` : `Sell $${symbol}`;
  if (!publicKey) cta = "Connect wallet to trade";
  else if (curve.complete) cta = "Graduated — trade on DEX";
  else if (side === "buy" && (pad.paused || platform.paused)) cta = "Buying paused";
  else if (insufficient) cta = "Insufficient balance";
  else if (busy) cta = "Confirming…";

  return (
    <div className="card trade-panel">
      <div className="tabs">
        <button className={side === "buy" ? "tab active buy" : "tab"} onClick={() => { setSide("buy"); setAmount(""); }}>
          Buy
        </button>
        <button className={side === "sell" ? "tab active sell" : "tab"} onClick={() => { setSide("sell"); setAmount(""); }}>
          Sell
        </button>
      </div>

      <div className="row between tiny muted mt">
        <span>Amount ({side === "buy" ? "SOL" : `$${symbol}`})</span>
        {publicKey && (
          <span className="mono">
            Bal: {side === "buy" ? `${fmtSol(solBal, 3)} SOL` : `${fmtTokens(tokBal)}`}
          </span>
        )}
      </div>
      <div className="amount-input">
        <input inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
        <span className="unit">{side === "buy" ? "SOL" : symbol}</span>
      </div>
      <div className="presets">
        {presets.map((p) => (
          <button key={p} onClick={() => applyPreset(p)}>
            {p}
            {side === "buy" ? " SOL" : ""}
          </button>
        ))}
      </div>

      <div className="quote">
        {quote?.buy && (
          <>
            <div className="row between">
              <span className="muted">You receive</span>
              <span className="mono neon-green">{fmtTokens(quote.buy.tokensOut)} ${symbol}</span>
            </div>
            <div className="row between">
              <span className="muted">Fee ({feeBps / 100}%)</span>
              <span className="mono">{fmtSol(quote.buy.fee, 6)} SOL</span>
            </div>
            {quote.buy.completes && (
              <div className="note">This buy completes the curve. You only pay {fmtSol(quote.buy.totalCost)} SOL.</div>
            )}
          </>
        )}
        {quote?.sell && (
          <>
            <div className="row between">
              <span className="muted">You receive</span>
              <span className="mono neon-green">{fmtSol(quote.sell.net, 6)} SOL</span>
            </div>
            <div className="row between">
              <span className="muted">Fee ({feeBps / 100}%)</span>
              <span className="mono">{fmtSol(quote.sell.fee, 6)} SOL</span>
            </div>
            {quote.sell.exceedsReserves && <div className="note warn">Not enough SOL in the curve for this sell.</div>}
          </>
        )}
        <div className="row between">
          <span className="muted">Slippage</span>
          <span className="slip">
            {[1, 2, 5, 10].map((s) => (
              <button key={s} className={slippage === s ? "on" : ""} onClick={() => setSlippage(s)}>
                {s}%
              </button>
            ))}
          </span>
        </div>
      </div>

      <button className={`btn btn-block ${side === "buy" ? "btn-primary" : "btn-pink"}`} disabled={disabled || !!quote?.sell?.exceedsReserves} onClick={submit}>
        {cta}
      </button>
    </div>
  );
}
