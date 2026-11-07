import { describe, expect, it } from "vitest";
import { canStartPayment, DEFAULT_PENDING_ORDER_TTL_HOURS, expiryCutoff, paymentDeadline, pendingOrderTtlHours } from "./order-expiry";

describe("order expiry", () => {
  it("parses the TTL with a safe default", () => {
    expect(pendingOrderTtlHours(undefined)).toBe(DEFAULT_PENDING_ORDER_TTL_HOURS);
    expect(pendingOrderTtlHours("abc")).toBe(DEFAULT_PENDING_ORDER_TTL_HOURS);
    expect(pendingOrderTtlHours("0")).toBe(DEFAULT_PENDING_ORDER_TTL_HOURS);
    expect(pendingOrderTtlHours("24")).toBe(24);
  });
  it("computes the cutoff", () => {
    expect(expiryCutoff(new Date("2026-11-05T12:00:00Z"), 48).toISOString()).toBe("2026-11-03T12:00:00.000Z");
  });
});

describe("online payment window", () => {
  const created = new Date("2026-11-07T10:00:00Z");

  it("closes an hour before the order is auto-cancelled", () => {
    expect(paymentDeadline(created, 24).toISOString()).toBe("2026-11-08T09:00:00.000Z");
  });

  it("keeps a window for very short limits", () => {
    expect(paymentDeadline(created, 1).toISOString()).toBe("2026-11-07T10:45:00.000Z");
  });

  it("needs at least 20 minutes left to start paying", () => {
    const deadline = paymentDeadline(created, 24);
    expect(canStartPayment(deadline, new Date("2026-11-08T08:30:00Z"))).toBe(true);
    expect(canStartPayment(deadline, new Date("2026-11-08T08:45:00Z"))).toBe(false);
  });
});
