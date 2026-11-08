/** How often the admin's live pages fetch fresh data while the tab is open. */
export const LIVE_REFRESH_MS = 20_000;
/** Orders placed within this time get a "New" tag in the admin. */
export const NEW_ORDER_MS = 10 * 60_000;

export const isNewOrder = (createdAt: Date | string, now = Date.now()) => now - new Date(createdAt).getTime() < NEW_ORDER_MS;

/** "just now", "15 s ago", "2 min ago". */
export function updatedAgo(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s} s ago`;
  return `${Math.floor(s / 60)} min ago`;
}
