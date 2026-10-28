// InstaSwapPanel.tsx
import { useState } from "react";
import { quoteLite, swapLite, swapStatusLite, InstaswapError, type QuoteResponse, type SwapResponse, type StatusResponse } from "./instaswap";

export default function InstaSwapPanel() {
  const [fromId, setFromId] = useState("btc.btc");
  const [toId, setToId] = useState("eth.eth");
  const [amount, setAmount] = useState("0.001");
  const [recipient, setRecipient] = useState("");
  const [refund, setRefund] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [phase, setPhase] = useState<"idle" | "quoting" | "quoted" | "creating" | "created" | "error">("idle");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [order, setOrder] = useState<SwapResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<InstaswapError | Error | null>(null);

  async function handleQuote() {
    setPhase("quoting"); setError(null); setOrder(null); setStatus(null);
    try {
      const q = await quoteLite({
        from: fromId, to: toId, amount,
        ...(isPrivate && { private: true as const }),
        minMaxInfo: true,
      });
      setQuote(q); setPhase("quoted");
    } catch (e: any) { setError(e); setPhase("error"); }
  }

  async function handleCreate() {
    setPhase("creating"); setError(null);
    try {
      const s = await swapLite({
        from: fromId, to: toId, amount,
        recipientAddress: recipient,
        refundAddress: refund,
        ...(isPrivate && { private: true as const }),
      });
      setOrder(s); setPhase("created");
    } catch (e: any) { setError(e); setPhase("error"); }
  }

  async function handleRefresh() {
    if (!order?.txid) return;
    try {
      const st = await swapStatusLite(order.txid);
      setStatus(st);
    } catch (e: any) { setError(e); }
  }

  return (
    <div dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <label>من (مثال: btc.btc)</label>
        <input value={fromId} onChange={e => { setFromId(e.target.value); setPhase("idle"); setQuote(null); }} />

        <label>إلى (مثال: eth.eth)</label>
        <input value={toId} onChange={e => { setToId(e.target.value); setPhase("idle"); setQuote(null); }} />

        <label>المبلغ (نص، مثال 0.001)</label>
        <input value={amount} onChange={e => { setAmount(e.target.value); setPhase("idle"); setQuote(null); }} inputMode="decimal" />

        <label>
          <input type="checkbox" checked={isPrivate} onChange={e => { setIsPrivate(e.target.checked); setPhase("idle"); setQuote(null); }} />
          {" "}خصوصية (confidential rail)
        </label>

        <label>عنوان المستلم (أو ENS)</label>
        <input value={recipient} onChange={e => setRecipient(e.target.value)} />

        <label>عنوان الاسترداد (أو ENS)</label>
        <input value={refund} onChange={e => setRefund(e.target.value)} />

        <button disabled={phase === "quoting" || !amount} onClick={handleQuote}>
          {phase === "quoting" ? "جارٍ الاقتباس..." : "احصل على سعر"}
        </button>
      </div>

      {phase === "quoted" && quote && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ccc", borderRadius: 8 }}>
          <div><strong>تستلم تقريباً:</strong> {quote.estimatedOut}</div>
          {quote.minMaxInfo && (
            <div style={{ fontSize: 12 }}>
              الحد الأدنى: {quote.minMaxInfo.minimum ?? "—"} / الأقصى: {quote.minMaxInfo.maximum === "unlimited" ? "غير محدود" : quote.minMaxInfo.maximum}
            </div>
          )}
          <button disabled={!recipient || !refund} onClick={handleCreate} style={{ marginTop: 8 }}>
            {phase === "creating" ? "جارٍ الإنشاء..." : "إنشاء الطلب"}
          </button>
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginTop: 16, padding: 12, background: "#fee", borderRadius: 8 }}>
          <div><strong>خطأ:</strong> {error.message}</div>
          {"minimum" in error && (error as any).minimum != null && <div>الحد الأدنى: {(error as any).minimum}</div>}
          {"maximum" in error && (error as any).maximum != null && <div>الحد الأقصى: {(error as any).maximum}</div>}
          {"retryAfterSeconds" in error && (error as any).retryAfterSeconds != null && <div>أعد المحاولة بعد {(error as any).retryAfterSeconds} ثانية</div>}
        </div>
      )}

      {phase === "created" && order && (
        <div style={{ marginTop: 16, padding: 12, background: "#efe", borderRadius: 8 }}>
          <h3>أرسل الإيداع إلى:</h3>
          <div><strong>العنوان:</strong> <code>{order.depositAddress}</code></div>
          {order.depositMemo && <div><strong>المذكرة (إلزامية):</strong> <code>{order.depositMemo}</code></div>}
          <div><strong>المبلغ بالضبط:</strong> <code>{order.depositAmountExact ?? amount}</code></div>
          {order.expiresAt && <div><strong>ينتهي:</strong> {new Date(order.expiresAt).toLocaleString()}</div>}
          <div style={{ fontSize: 12 }}>{order.instructions}</div>

          <button onClick={handleRefresh} style={{ marginTop: 8 }}>تحديث الحالة</button>
          {status && (
            <div style={{ marginTop: 8 }}>
              <strong>الحالة:</strong> {status.state}
              {status.expired === true && " (منتهي)"}
              {status.depositSeen === true && " (تم رؤية الإيداع)"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
