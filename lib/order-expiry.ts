/**
 * How long an unpaid order holds its candles. The customer pays online straight after checkout:
 * - they get PAY_WINDOW_MS to open the payment page (and again after a failed payment, with a countdown);
 * - while Cashfree's payment page is open the order is held until that page expires (CHECKOUT_OPEN_MS),
 *   since Cashfree won't open a payment page for less than 15 minutes.
 * Once the hold passes, the order is cancelled and its stock goes back on sale.
 */
export const PAY_WINDOW_MS = 5 * 60_000;
export const CHECKOUT_OPEN_MS = 16 * 60_000;

/** A payment can't be started in the last few seconds of the hold: the order is about to be cancelled. */
const START_MARGIN_MS = 5_000;

export const payWindowEnd = (now: Date) => new Date(now.getTime() + PAY_WINDOW_MS);
export const checkoutExpiry = (now: Date) => new Date(now.getTime() + CHECKOUT_OPEN_MS);
export const canStartPayment = (payBy: Date, now: Date) => payBy.getTime() - now.getTime() > START_MARGIN_MS;
export const isOverdue = (payBy: Date, now: Date) => payBy.getTime() <= now.getTime();

/** Time left as m:ss, rounded up so "0:00" only shows once time has really run out. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
