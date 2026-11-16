import { describe, expect, it } from "vitest";
import { priceCart, type VariantInfo } from "./pricing";

const v = (over: Partial<VariantInfo> = {}): VariantInfo => ({
  id: 1, productId: 10, productName: "Rose Candle", variantName: "200g", price: 499, stock: 5, isActive: true,
  weightGrams: 400, lengthCm: 20, widthCm: 10, heightCm: 10, ...over,
});

describe("priceCart", () => {
  it("uses server prices and computes totals", () => {
    const r = priceCart([{ variantId: 1, quantity: 2 }], [v()]);
    expect(r).toMatchObject({ ok: true, subtotal: 998, grams: 800 });
  });

  it("merges duplicate lines before checking stock", () => {
    const r = priceCart([{ variantId: 1, quantity: 2 }, { variantId: 1, quantity: 2 }], [v({ stock: 3 })]);
    expect(r).toEqual({ ok: false, error: "Only 3 left of Rose Candle (200g)." });
  });

  it("caps the merged quantity per variant even with plenty of stock", () => {
    const lines = [{ variantId: 1, quantity: 3 }, { variantId: 1, quantity: 3 }];
    expect(priceCart(lines, [v({ stock: 500 })])).toEqual({ ok: false, error: "You can order at most 5 of each item." });
    expect(priceCart([{ variantId: 1, quantity: 5 }], [v({ stock: 500 })]).ok).toBe(true);
    expect(priceCart([{ variantId: 1, quantity: 6 }], [v({ stock: 500 })]).ok).toBe(false);
  });

  it("rejects out of stock", () => {
    const r = priceCart([{ variantId: 1, quantity: 1 }], [v({ stock: 0 })]);
    expect(r).toEqual({ ok: false, error: "Rose Candle (200g) is out of stock." });
  });

  it("rejects missing or inactive variants", () => {
    expect(priceCart([{ variantId: 2, quantity: 1 }], [v()]).ok).toBe(false);
    expect(priceCart([{ variantId: 1, quantity: 1 }], [v({ isActive: false })]).ok).toBe(false);
  });

  it("rejects empty cart and bad quantities", () => {
    expect(priceCart([], [v()])).toEqual({ ok: false, error: "Your cart is empty." });
    expect(priceCart([{ variantId: 1, quantity: 0 }], [v()]).ok).toBe(false);
  });

  it("weighs the parcel by real or size weight, whichever is more", () => {
    // Each: 400 g real, 20 × 10 × 10 cm = 400 g size; a bigger box tips it to size weight.
    expect(priceCart([{ variantId: 1, quantity: 3 }], [v()])).toMatchObject({ ok: true, grams: 1200 });
    expect(priceCart([{ variantId: 1, quantity: 1 }], [v({ heightCm: 25 })])).toMatchObject({ ok: true, grams: 1000 });
  });
});
