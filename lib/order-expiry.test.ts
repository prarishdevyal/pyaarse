import { describe, expect, it } from "vitest";
import { canStartPayment, CHECKOUT_OPEN_MS, checkoutExpiry, formatCountdown, isOverdue, PAY_WINDOW_MS, payWindowEnd } from "./order-expiry";

const now = new Date("2026-11-07T10:00:00Z");

describe("order hold", () => {
  it("gives 5 minutes to pay", () => {
    expect(PAY_WINDOW_MS).toBe(5 * 60_000);
    expect(payWindowEnd(now).toISOString()).toBe("2026-11-07T10:05:00.000Z");
  });
  it("keeps Cashfree's payment page open longer than its 15-minute minimum", () => {
    expect(CHECKOUT_OPEN_MS).toBeGreaterThan(15 * 60_000);
    expect(checkoutExpiry(now).toISOString()).toBe("2026-11-07T10:16:00.000Z");
  });
  it("refuses to start a payment in the last seconds of the hold", () => {
    const payBy = payWindowEnd(now);
    expect(canStartPayment(payBy, new Date(payBy.getTime() - 60_000))).toBe(true);
    expect(canStartPayment(payBy, new Date(payBy.getTime() - 2_000))).toBe(false);
    expect(canStartPayment(payBy, new Date(payBy.getTime() + 1))).toBe(false);
  });
  it("is overdue exactly when the hold has passed", () => {
    const payBy = payWindowEnd(now);
    expect(isOverdue(payBy, new Date(payBy.getTime() - 1))).toBe(false);
    expect(isOverdue(payBy, payBy)).toBe(true);
  });
});

describe("formatCountdown", () => {
  it("shows minutes and seconds", () => {
    expect(formatCountdown(PAY_WINDOW_MS)).toBe("5:00");
    expect(formatCountdown(61_000)).toBe("1:01");
    expect(formatCountdown(9_500)).toBe("0:10");
  });
  it("never goes below zero", () => expect(formatCountdown(-3_000)).toBe("0:00"));
  it("reads well for long deadlines", () => {
    expect(formatCountdown(3 * 86_400_000 - 1)).toBe("3 days 0 h");
    expect(formatCountdown(26 * 3600_000)).toBe("1 day 2 h");
    expect(formatCountdown(2 * 3600_000 + 5 * 60_000)).toBe("2 h 5 min");
  });
});
