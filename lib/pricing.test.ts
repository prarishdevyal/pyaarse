import { describe, expect, it } from "vitest";
import { calcShipping, priceCart, type VariantInfo } from "./pricing";

const s = { shippingFee: 79, freeShippingThreshold: 999 };
const v = (over: Partial<VariantInfo> = {}): VariantInfo => ({
  id: 1, productId: 10, productName: "Rose Candle", variantName: "200g", price: 499, stock: 5, isActive: true, ...over,
});

describe("calcShipping", () => {
  it("charges fee below threshold", () => expect(calcShipping(998, s)).toBe(79));
  it("is free at the threshold", () => expect(calcShipping(999, s)).toBe(0));
  it("is free for an empty cart", () => expect(calcShipping(0, s)).toBe(0));
});

describe("priceCart", () => {
  it("uses server prices and computes totals", () => {
    const r = priceCart([{ variantId: 1, quantity: 2 }], [v()], s);
    expect(r).toMatchObject({ ok: true, subtotal: 998, shipping: 79, total: 1077 });
  });

  it("merges duplicate lines before checking stock", () => {
    const r = priceCart([{ variantId: 1, quantity: 3 }, { variantId: 1, quantity: 3 }], [v()], s);
    expect(r).toEqual({ ok: false, error: "Only 5 left of Rose Candle (200g)." });
  });

  it("caps the merged quantity per variant even with plenty of stock", () => {
    const lines = [{ variantId: 1, quantity: 10 }, { variantId: 1, quantity: 10 }, { variantId: 1, quantity: 10 }];
    expect(priceCart(lines, [v({ stock: 500 })], s)).toEqual({ ok: false, error: "You can order at most 10 of each item." });
    expect(priceCart([{ variantId: 1, quantity: 10 }], [v({ stock: 500 })], s).ok).toBe(true);
  });

  it("rejects out of stock", () => {
    const r = priceCart([{ variantId: 1, quantity: 1 }], [v({ stock: 0 })], s);
    expect(r).toEqual({ ok: false, error: "Rose Candle (200g) is out of stock." });
  });

  it("rejects missing or inactive variants", () => {
    expect(priceCart([{ variantId: 2, quantity: 1 }], [v()], s).ok).toBe(false);
    expect(priceCart([{ variantId: 1, quantity: 1 }], [v({ isActive: false })], s).ok).toBe(false);
  });

  it("rejects empty cart and bad quantities", () => {
    expect(priceCart([], [v()], s)).toEqual({ ok: false, error: "Your cart is empty." });
    expect(priceCart([{ variantId: 1, quantity: 0 }], [v()], s).ok).toBe(false);
  });

  it("gives free shipping over threshold", () => {
    const r = priceCart([{ variantId: 1, quantity: 3 }], [v()], s);
    expect(r).toMatchObject({ ok: true, subtotal: 1497, shipping: 0, total: 1497 });
  });
});
