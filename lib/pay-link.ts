import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pay links (`/order-confirmed?n=PY1042&t=…`) carry an HMAC of the order number, so knowing an order
 * number alone isn't enough to open its payment page. The key is derived from a server secret.
 */
function linkKey(env: Record<string, string | undefined>): string {
  const secret = env.PAY_LINK_SECRET || env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("PAY_LINK_SECRET or SUPABASE_SECRET_KEY must be set for pay links");
  return createHmac("sha256", secret).update("pyaarse-pay-link-v1").digest("hex");
}

export function payToken(orderNumber: string, env: Record<string, string | undefined> = process.env): string {
  return createHmac("sha256", linkKey(env)).update(orderNumber).digest("base64url").slice(0, 24);
}

export function checkPayToken(orderNumber: string, token: unknown, env: Record<string, string | undefined> = process.env): boolean {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{24}$/.test(token)) return false;
  const a = Buffer.from(payToken(orderNumber, env));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const payPath = (orderNumber: string, env?: Record<string, string | undefined>) =>
  `/order-confirmed?n=${encodeURIComponent(orderNumber)}&t=${payToken(orderNumber, env)}`;
