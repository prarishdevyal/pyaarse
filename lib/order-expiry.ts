export const DEFAULT_PENDING_ORDER_TTL_HOURS = 24;

/** Hours an unpaid order may hold stock. Invalid or too-small values fall back to the default. */
export function pendingOrderTtlHours(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_PENDING_ORDER_TTL_HOURS;
}

/** Pending orders created before this instant have expired. */
export function expiryCutoff(now: Date, ttlHours: number): Date {
  return new Date(now.getTime() - ttlHours * 3600_000);
}

/**
 * Online payment closes before the unpaid order is auto-cancelled (an hour before, or a quarter of the
 * time for very short limits), so a payment can't land on a cancelled order.
 */
export function paymentDeadline(createdAt: Date, ttlHours: number): Date {
  const ttl = ttlHours * 3600_000;
  return new Date(createdAt.getTime() + ttl - Math.min(3600_000, ttl / 4));
}

/** Cashfree needs an expiry at least 15 minutes ahead; leave a little margin. */
export const MIN_PAYMENT_WINDOW_MS = 20 * 60_000;
export const canStartPayment = (deadline: Date, now: Date) => deadline.getTime() - now.getTime() >= MIN_PAYMENT_WINDOW_MS;
