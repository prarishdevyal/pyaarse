import { describe, expect, it } from "vitest";
import { DEFAULT_PENDING_ORDER_TTL_HOURS, expiryCutoff, pendingOrderTtlHours } from "./order-expiry";

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
