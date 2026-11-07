import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cashfree Payment Gateway client. Server-side only: it holds the secret key.
 * (No "server-only" import so the pure helpers can be unit-tested; lib/payments.ts is the only caller.)
 */

export type CashfreeMode = "sandbox" | "production";
export type CashfreeConfig = { mode: CashfreeMode; appId: string; secretKey: string; baseUrl: string };

const API_VERSION = "2025-01-01";
const BASE_URL: Record<CashfreeMode, string> = {
  sandbox: "https://sandbox.cashfree.com/pg",
  production: "https://api.cashfree.com/pg",
};

/**
 * The key pair picked by CASHFREE_ENV, or null when it isn't filled in (online payment is then off).
 * On the live Vercel deployment CASHFREE_ENV must be spelled out: a missing or mistyped value must not
 * quietly switch the real shop to sandbox, where test payments would mark real orders paid.
 */
export function cashfreeConfig(env: Record<string, string | undefined> = process.env): CashfreeConfig | null {
  const wanted = env.CASHFREE_ENV?.trim().toLowerCase();
  if (wanted !== "sandbox" && wanted !== "production" && env.VERCEL_ENV === "production") return null;
  const mode: CashfreeMode = wanted === "production" ? "production" : "sandbox";
  const prefix = mode === "production" ? "CASHFREE_PROD" : "CASHFREE_SANDBOX";
  const appId = env[`${prefix}_APP_ID`]?.trim();
  const secretKey = env[`${prefix}_SECRET_KEY`]?.trim();
  if (!appId || !secretKey) return null;
  return { mode, appId, secretKey, baseUrl: BASE_URL[mode] };
}

/** Webhooks older than this are refused (defence in depth: every webhook is re-checked with Cashfree anyway). */
export const WEBHOOK_MAX_AGE_MS = 10 * 60_000;

/**
 * Checks x-webhook-signature = base64(HMAC-SHA256(timestamp + rawBody, secretKey)).
 * The raw body must be exactly as received: parsing and re-serialising it changes the bytes.
 */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secretKey: string,
  now = Date.now(),
): boolean {
  if (!timestamp || !signature || !/^\d{9,14}$/.test(timestamp)) return false;
  const n = Number(timestamp);
  const ms = n > 1e12 ? n : n * 1000;
  if (Math.abs(now - ms) > WEBHOOK_MAX_AGE_MS) return false;
  const expected = createHmac("sha256", secretKey).update(timestamp + rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Cashfree's order id inside a verified webhook body, if it looks like one of ours. */
export function webhookOrderId(rawBody: string): string | null {
  try {
    const id = JSON.parse(rawBody)?.data?.order?.order_id;
    return typeof id === "string" && isProviderOrderId(id) ? id : null;
  } catch {
    return null;
  }
}

/** Our Cashfree order ids: the order number plus a random suffix, e.g. PY1042_k3j9x2. */
export const providerOrderIdFor = (orderNumber: string, random = crypto.randomUUID()) =>
  `${orderNumber}_${random.replace(/[^a-z0-9]/gi, "").slice(0, 8)}`;
export const isProviderOrderId = (id: string) => /^PY\d{1,9}_[A-Za-z0-9]{4,12}$/.test(id);

/** Rupee amounts are whole numbers here; Cashfree may send 1299, 1299.0 or "1299.00". */
export function sameAmount(cashfree: unknown, rupees: number): boolean {
  const n = typeof cashfree === "string" ? Number(cashfree) : cashfree;
  return typeof n === "number" && Number.isFinite(n) && Math.round(n * 100) === rupees * 100;
}

export type CreateOrderInput = {
  providerOrderId: string;
  amount: number;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  returnUrl: string;
  notifyUrl: string | null;
  expiresAt: Date;
};

export function createOrderBody(i: CreateOrderInput) {
  const name = i.name.trim().slice(0, 100);
  return {
    order_id: i.providerOrderId,
    order_amount: i.amount,
    order_currency: "INR",
    customer_details: {
      customer_id: i.customerId.replace(/[^A-Za-z0-9]/g, "").slice(0, 50),
      customer_phone: i.phone.replace(/\D/g, "").slice(-10),
      customer_email: i.email,
      ...(name.length >= 3 ? { customer_name: name } : {}),
    },
    order_meta: {
      return_url: i.returnUrl,
      // Cashfree only calls https endpoints, so local development relies on the return page check.
      ...(i.notifyUrl?.startsWith("https://") ? { notify_url: i.notifyUrl } : {}),
    },
    order_expiry_time: i.expiresAt.toISOString(),
  };
}

export type CashfreeOrderStatus = "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";
export type CashfreeOrder = {
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: CashfreeOrderStatus;
  payment_session_id?: string;
};
export type CashfreePayment = {
  cf_payment_id: string | number;
  payment_status: string;
  payment_amount: number | string;
  payment_currency?: string;
  payment_group?: string;
  payment_time?: string;
};

export class CashfreeError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export function cashfreeClient(config: CashfreeConfig, fetchImpl: FetchLike = fetch) {
  async function call<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const res = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers: {
        "x-client-id": config.appId,
        "x-client-secret": config.secretKey,
        "x-api-version": API_VERSION,
        "content-type": "application/json",
        accept: "application/json",
        ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON error page */
    }
    if (!res.ok) {
      // Never include request headers here: they carry the secret key.
      const msg = typeof json.message === "string" ? json.message : `HTTP ${res.status}`;
      throw new CashfreeError(`Cashfree: ${msg}`, res.status, typeof json.code === "string" ? json.code : undefined);
    }
    return json as T;
  }

  const enc = encodeURIComponent;
  return {
    createOrder: (input: CreateOrderInput) => call<CashfreeOrder>("POST", "/orders", createOrderBody(input), input.providerOrderId),
    getOrder: (id: string) => call<CashfreeOrder>("GET", `/orders/${enc(id)}`),
    getPayments: (id: string) => call<CashfreePayment[]>("GET", `/orders/${enc(id)}/payments`),
    /** Stops further payment attempts on an order we no longer want paid online. */
    terminateOrder: (id: string) => call<CashfreeOrder>("PATCH", `/orders/${enc(id)}`, { order_status: "TERMINATED" }),
  };
}

export type CashfreeClient = ReturnType<typeof cashfreeClient>;

/** The successful payment of a PAID order whose amount matches ours, or null. */
export function successfulPayment(order: CashfreeOrder, payments: CashfreePayment[], total: number): CashfreePayment | null {
  if (order.order_status !== "PAID" || order.order_currency !== "INR" || !sameAmount(order.order_amount, total)) return null;
  return (
    payments.find(
      (p) => p.payment_status === "SUCCESS" && sameAmount(p.payment_amount, total) && (p.payment_currency ?? "INR") === "INR",
    ) ?? null
  );
}
