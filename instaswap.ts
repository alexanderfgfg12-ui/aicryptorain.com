// instaswap.ts
const BASE = "https://walletlessapi.instaswap.com";
const AFFILIATE_ID = import.meta.env.VITE_INSTASWAP_AFFILIATE_ID || "0X0PUTVJ";

export type QuoteResponse = {
  estimatedOut: number;
  estimatedOutUsd?: number | null;
  depositAmount: number;
  depositAmountUsd?: number | null;
  feeBreakdown?: Array<{ type: string; asset?: string | null; amountUsd?: number | null }>;
  etaSeconds?: number | null;
  fastTrackAvailable?: boolean | null;
  private?: boolean | null;
  minMaxInfo?: {
    minimum: number | null;
    minimumUsd: number | null;
    maximum: number | "unlimited";
    maximumUsd: number | "unlimited";
  } | null;
};

export type SwapResponse = {
  txid: string;
  ownerToken?: string;
  estimatedOut: number;
  depositAmount: number;
  depositAmountExact?: string | null;
  depositAddress: string;
  depositNetwork: string;
  depositTokenSymbol: string;
  depositMemo?: string | null;
  refundAddress?: string | null;
  expiresAt?: string | null;
  instructions: string;
  private?: boolean | null;
};

export type StatusResponse = {
  state: "awaiting_deposit" | "swapping" | "complete" | "completed" | "failed" | "refund";
  expired?: boolean;
  depositSeen?: boolean;
  depositTxHash?: string | null;
  withdrawTxHash?: string | null;
  privacyMode?: "private" | "zkproof" | null;
  txid: string;
  deposit_address: string;
  amount: number;
  expected_output?: number | null;
  actual_output?: number | null;
  from_token: string;
  to_token: string;
  recipientMasked?: string | null;
  view?: string;
};

export class InstaswapError extends Error {
  code?: string;
  reason?: string;
  minimum?: number;
  maximum?: number;
  retryAfterSeconds?: number;
  status: number;
  constructor(status: number, body: any) {
    super(body?.message || body?.error || `InstaSwap ${status}`);
    this.status = status;
    this.code = body?.code;
    this.reason = body?.reason;
    this.minimum = body?.minimum;
    this.maximum = body?.maximum;
    this.retryAfterSeconds = body?.retryAfterSeconds;
  }
}

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text }; }
  if (!res.ok) throw new InstaswapError(res.status, json);
  return json as T;
}

export async function quoteLite(input: {
  from: string;
  to: string;
  amount: string;
  private?: boolean | "force";
  minMaxInfo?: boolean;
  fastTrack?: boolean;
}) {
  const json = await call<{ [k: string]: any }>("/quote-lite", {
    method: "POST",
    body: JSON.stringify({ affiliateId: AFFILIATE_ID, ...input }),
  });
  return json as QuoteResponse;
}

export async function swapLite(input: {
  from: string;
  to: string;
  amount: string;
  recipientAddress: string;
  refundAddress: string;
  recipientExpectedAddress?: string;
  refundExpectedAddress?: string;
  private?: boolean | "force";
  fastTrack?: boolean;
}) {
  const json = await call<{ [k: string]: any }>("/swap-lite", {
    method: "POST",
    body: JSON.stringify({ affiliateId: AFFILIATE_ID, ...input }),
  });
  return json as SwapResponse;
}

export async function swapStatusLite(txid: string) {
  return call<StatusResponse>(`/swap/${encodeURIComponent(txid)}/status-lite`, {
    method: "GET",
  });
}

export async function fetchTokens() {
  return call<{ tokens: Array<{ id: string; symbol: string; name: string; network: string; usdPrice?: number | null }>; total: number }>(
    "/tokens-lite",
    { method: "GET" }
  );
}
