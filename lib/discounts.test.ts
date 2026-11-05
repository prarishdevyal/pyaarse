import { describe, expect, it } from "vitest";
import { couponDiscount, describeCoupon, expiryFromDate, fromStoredPrices, isOnSale, normalizeCode, percentOff, toStoredPrices, totalsWithDiscount, type CouponRule } from "./discounts";

const now = new Date("2026-11-05T12:00:00Z");
const c = (o: Partial<CouponRule> = {}): CouponRule => ({
  code: "DIWALI10", kind: "percent", value: 10, minSubtotal: 0, maxDiscount: null, expiresAt: null, usageLimit: null, usedCount: 0, isActive: true, ...o,
});

describe("couponDiscount", () => {
  it("takes a percentage, rounded down, with an optional cap", () => {
    expect(couponDiscount(c(), 1299, now)).toEqual({ ok: true, discount: 129 });
    expect(couponDiscount(c({ maxDiscount: 100 }), 1999, now)).toEqual({ ok: true, discount: 100 });
  });
  it("takes a flat amount but never more than the subtotal", () => {
    expect(couponDiscount(c({ kind: "flat", value: 150 }), 999, now)).toEqual({ ok: true, discount: 150 });
    expect(couponDiscount(c({ kind: "flat", value: 500 }), 300, now)).toEqual({ ok: true, discount: 300 });
  });
  it("needs the minimum order", () => {
    expect(couponDiscount(c({ minSubtotal: 999 }), 899, now)).toEqual({ ok: false, error: "Add ₹100 more to use DIWALI10." });
    expect(couponDiscount(c({ minSubtotal: 999 }), 999, now).ok).toBe(true);
  });
  it("rejects unknown, switched-off, expired and used-up codes", () => {
    expect(couponDiscount(null, 999, now)).toEqual({ ok: false, error: "That code isn't valid." });
    expect(couponDiscount(c({ isActive: false }), 999, now).ok).toBe(false);
    expect(couponDiscount(c({ expiresAt: new Date("2026-11-05T11:59:59Z") }), 999, now)).toEqual({ ok: false, error: "That code has expired." });
    expect(couponDiscount(c({ expiresAt: new Date("2026-11-06T00:00:00Z") }), 999, now).ok).toBe(true);
    expect(couponDiscount(c({ usageLimit: 5, usedCount: 5 }), 999, now)).toEqual({ ok: false, error: "That code has been fully used." });
  });
  it("refuses a zero discount", () => expect(couponDiscount(c({ value: 1 }), 50, now).ok).toBe(false));
});

describe("totalsWithDiscount", () => {
  const s = { shippingFee: 79, freeShippingThreshold: 999 };
  it("judges free shipping after the discount", () => {
    expect(totalsWithDiscount(1099, 200, s)).toEqual({ subtotal: 1099, discount: 200, shipping: 79, total: 978 });
    expect(totalsWithDiscount(1299, 100, s)).toEqual({ subtotal: 1299, discount: 100, shipping: 0, total: 1199 });
  });
});

describe("sale prices", () => {
  it("stores a sale as price + compare-at, and reads it back", () => {
    expect(toStoredPrices(699, 499)).toEqual({ price: 499, compareAtPrice: 699 });
    expect(toStoredPrices(699, null)).toEqual({ price: 699, compareAtPrice: null });
    expect(toStoredPrices(699, 799)).toEqual({ price: 699, compareAtPrice: null });
    expect(fromStoredPrices({ price: 499, compareAtPrice: 699 })).toEqual({ regular: 699, sale: 499 });
    expect(fromStoredPrices({ price: 699, compareAtPrice: null })).toEqual({ regular: 699, sale: null });
  });
  it("knows when something is on sale and by how much", () => {
    expect(isOnSale({ price: 499, compareAtPrice: 699 })).toBe(true);
    expect(isOnSale({ price: 499, compareAtPrice: 499 })).toBe(false);
    expect(percentOff({ price: 499, compareAtPrice: 699 })).toBe(29);
    expect(percentOff({ price: 499, compareAtPrice: null })).toBe(0);
  });
});

describe("helpers", () => {
  it("normalises codes", () => expect(normalizeCode(" diwali 10 ")).toBe("DIWALI10"));
  it("describes coupons", () => {
    expect(describeCoupon(c({ maxDiscount: 200, minSubtotal: 999 }))).toBe("10% off (up to ₹200) on ₹999+");
    expect(describeCoupon(c({ kind: "flat", value: 100 }))).toBe("₹100 off");
  });
});

describe("expiryFromDate", () => {
  it("ends at midnight India time on the chosen day", () => {
    expect(expiryFromDate("2026-11-30")?.toISOString()).toBe("2026-11-30T18:29:59.999Z");
    expect(expiryFromDate("")).toBeNull();
    expect(expiryFromDate("30/11/2026")).toBeNull();
  });
});
