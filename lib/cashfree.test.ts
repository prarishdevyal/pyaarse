import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  CashfreeError,
  cashfreeClient,
  cashfreeConfig,
  createOrderBody,
  isProviderOrderId,
  providerOrderIdFor,
  sameAmount,
  successfulPayment,
  verifyWebhookSignature,
  webhookOrderId,
  type CashfreeOrder,
} from "./cashfree";

const SECRET = "test-secret";
const sign = (ts: string, body: string, key = SECRET) => createHmac("sha256", key).update(ts + body).digest("base64");

describe("cashfreeConfig", () => {
  it("is off until the selected key pair is filled in", () => {
    expect(cashfreeConfig({})).toBeNull();
    expect(cashfreeConfig({ CASHFREE_ENV: "sandbox", CASHFREE_SANDBOX_APP_ID: "a", CASHFREE_SANDBOX_SECRET_KEY: " " })).toBeNull();
    expect(cashfreeConfig({ CASHFREE_ENV: "production", CASHFREE_SANDBOX_APP_ID: "a", CASHFREE_SANDBOX_SECRET_KEY: "b" })).toBeNull();
  });

  it("uses sandbox by default and production only when asked", () => {
    const env = { CASHFREE_SANDBOX_APP_ID: "sa", CASHFREE_SANDBOX_SECRET_KEY: "ss", CASHFREE_PROD_APP_ID: "pa", CASHFREE_PROD_SECRET_KEY: "ps" };
    expect(cashfreeConfig(env)).toMatchObject({ mode: "sandbox", appId: "sa", baseUrl: "https://sandbox.cashfree.com/pg" });
    expect(cashfreeConfig({ ...env, CASHFREE_ENV: "Production" })).toMatchObject({ mode: "production", appId: "pa", baseUrl: "https://api.cashfree.com/pg" });
    expect(cashfreeConfig({ ...env, CASHFREE_ENV: "typo" })?.mode).toBe("sandbox");
  });
});

describe("verifyWebhookSignature", () => {
  const body = '{"data":{"order":{"order_id":"PY1042_ab12cd34","order_amount":1299.00}},"type":"PAYMENT_SUCCESS_WEBHOOK"}';
  const now = 1_790_000_000_000;
  const ts = String(now);

  it("accepts Cashfree's signature over timestamp + raw body", () => {
    expect(verifyWebhookSignature(body, ts, sign(ts, body), SECRET, now)).toBe(true);
  });

  it("accepts a timestamp in seconds", () => {
    const s = String(now / 1000);
    expect(verifyWebhookSignature(body, s, sign(s, body), SECRET, now)).toBe(true);
  });

  it("rejects a changed body, a re-serialised body, or the wrong key", () => {
    expect(verifyWebhookSignature(body.replace("1299.00", "1.00"), ts, sign(ts, body), SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(JSON.stringify(JSON.parse(body)), ts, sign(ts, body), SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, ts, sign(ts, body, "other"), SECRET, now)).toBe(false);
  });

  it("rejects missing, malformed and stale headers", () => {
    expect(verifyWebhookSignature(body, null, sign(ts, body), SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, ts, null, SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, "abc", sign("abc", body), SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, ts, "not base64!!", SECRET, now)).toBe(false);
    const old = String(now - 11 * 60_000);
    expect(verifyWebhookSignature(body, old, sign(old, body), SECRET, now)).toBe(false);
  });
});

describe("order ids and amounts", () => {
  it("builds unique Cashfree order ids from the order number", () => {
    const id = providerOrderIdFor("PY1042", "3f2a9c1e-77aa-4c2b-9d1e-1234567890ab");
    expect(id).toBe("PY1042_3f2a9c1e");
    expect(isProviderOrderId(id)).toBe(true);
    expect(isProviderOrderId("PY1042")).toBe(false);
    expect(isProviderOrderId("../PY1042_abcd")).toBe(false);
  });

  it("reads our order id from a webhook body and ignores anything else", () => {
    expect(webhookOrderId('{"data":{"order":{"order_id":"PY7_abcd1234"}}}')).toBe("PY7_abcd1234");
    expect(webhookOrderId('{"data":{"order":{"order_id":"someone-else"}}}')).toBeNull();
    expect(webhookOrderId("not json")).toBeNull();
  });

  it("compares rupee amounts exactly", () => {
    expect(sameAmount(1299, 1299)).toBe(true);
    expect(sameAmount("1299.00", 1299)).toBe(true);
    expect(sameAmount(1299.01, 1299)).toBe(false);
    expect(sameAmount(1, 1299)).toBe(false);
    expect(sameAmount(undefined, 1299)).toBe(false);
  });
});

describe("createOrderBody", () => {
  const base = {
    providerOrderId: "PY1042_ab12cd34",
    amount: 1299,
    customerId: "1f0c6f3e-1234-4cde-9abc-0123456789ab",
    name: "Asha Rao",
    email: "asha@example.com",
    phone: "+919876543210",
    returnUrl: "https://www.pyaarse.net/order-confirmed?n=PY1042&t=x",
    notifyUrl: "https://www.pyaarse.net/api/payments/cashfree",
    expiresAt: new Date("2026-11-08T10:00:00Z"),
  };

  it("sends the amount from our order and Cashfree-safe customer details", () => {
    const b = createOrderBody(base);
    expect(b).toMatchObject({ order_id: "PY1042_ab12cd34", order_amount: 1299, order_currency: "INR", order_expiry_time: "2026-11-08T10:00:00.000Z" });
    expect(b.customer_details).toEqual({
      customer_id: "1f0c6f3e12344cde9abc0123456789ab",
      customer_phone: "9876543210",
      customer_email: "asha@example.com",
      customer_name: "Asha Rao",
    });
    expect(b.order_meta).toEqual({ return_url: base.returnUrl, notify_url: base.notifyUrl });
  });

  it("leaves out a webhook URL that isn't https, and a name that is too short", () => {
    const b = createOrderBody({ ...base, name: "Al", notifyUrl: "http://localhost:3000/api/payments/cashfree" });
    expect(b.order_meta).toEqual({ return_url: base.returnUrl });
    expect(b.customer_details).not.toHaveProperty("customer_name");
  });
});

describe("successfulPayment", () => {
  const order: CashfreeOrder = { order_id: "PY1_abcd", order_amount: 500, order_currency: "INR", order_status: "PAID" };
  const ok = { cf_payment_id: 123, payment_status: "SUCCESS", payment_amount: 500, payment_group: "upi" };

  it("finds the successful payment of a paid order with the right amount", () => {
    expect(successfulPayment(order, [{ ...ok, payment_status: "FAILED" }, ok], 500)).toEqual(ok);
  });

  it("refuses unpaid orders, wrong amounts and other currencies", () => {
    expect(successfulPayment({ ...order, order_status: "ACTIVE" }, [ok], 500)).toBeNull();
    expect(successfulPayment(order, [ok], 600)).toBeNull();
    expect(successfulPayment({ ...order, order_amount: 1 }, [{ ...ok, payment_amount: 1 }], 500)).toBeNull();
    expect(successfulPayment({ ...order, order_currency: "USD" }, [ok], 500)).toBeNull();
    expect(successfulPayment(order, [{ ...ok, payment_status: "PENDING" }], 500)).toBeNull();
  });
});

describe("cashfreeClient", () => {
  const config = cashfreeConfig({ CASHFREE_SANDBOX_APP_ID: "app", CASHFREE_SANDBOX_SECRET_KEY: "shh" })!;

  it("authenticates with headers and sends an idempotency key when creating", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ order_id: "PY1_abcd", order_status: "ACTIVE" }), { status: 200 }));
    const api = cashfreeClient(config, fetchMock);
    await api.createOrder({ providerOrderId: "PY1_abcd", amount: 10, customerId: "guest1", name: "Asha", email: "a@b.co", phone: "9876543210", returnUrl: "https://x/y", notifyUrl: null, expiresAt: new Date() });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://sandbox.cashfree.com/pg/orders");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "x-client-id": "app", "x-client-secret": "shh", "x-idempotency-key": "PY1_abcd" });
  });

  it("raises a CashfreeError without leaking the secret", async () => {
    const api = cashfreeClient(config, async () => new Response(JSON.stringify({ message: "order not found", code: "order_not_found" }), { status: 404 }));
    const err = await api.getOrder("PY1_abcd").catch((e) => e);
    expect(err).toBeInstanceOf(CashfreeError);
    expect(err.status).toBe(404);
    expect(err.message).not.toContain("shh");
  });
});
