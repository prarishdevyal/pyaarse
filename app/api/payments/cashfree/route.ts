import { cashfreeConfig, verifyWebhookSignature, webhookOrderId } from "@/lib/cashfree";
import { reconcileByProviderOrderId } from "@/lib/payments";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Cashfree payment webhook. The signature proves Cashfree sent it, but the body is still not trusted:
 * it only tells us which order to re-check, and the order is marked paid from Cashfree's API answer.
 */
export async function POST(request: Request) {
  const config = cashfreeConfig();
  if (!config) return new Response("Payments not configured", { status: 503 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return new Response("Too large", { status: 413 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new Response("Too large", { status: 413 });

  const ok = verifyWebhookSignature(raw, request.headers.get("x-webhook-timestamp"), request.headers.get("x-webhook-signature"), config.secretKey);
  if (!ok) return new Response("Invalid signature", { status: 401 });

  const id = webhookOrderId(raw);
  // Not one of ours (or a test ping): acknowledge so Cashfree doesn't retry it.
  if (!id) return Response.json({ ok: true });
  try {
    const state = await reconcileByProviderOrderId(id);
    return Response.json({ ok: true, state });
  } catch (e) {
    console.error("[cashfree webhook]", id, e instanceof Error ? e.message : e);
    // 5xx makes Cashfree retry later.
    return new Response("Try again", { status: 503 });
  }
}
