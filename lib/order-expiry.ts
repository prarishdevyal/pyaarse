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
