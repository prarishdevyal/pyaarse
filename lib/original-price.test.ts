import { describe, expect, it } from "vitest";
import { regularPriceFor, saleSavings } from "./original-price";

describe("regularPriceFor", () => {
  it("uses the price recorded at checkout", () => {
    expect(regularPriceFor({ unitPrice: 599, regularPrice: 856 }, { price: 650, compareAtPrice: null })).toBe(856);
  });
  it("falls back to today's regular price only if the sale price is unchanged", () => {
    expect(regularPriceFor({ unitPrice: 599, regularPrice: null }, { price: 599, compareAtPrice: 856 })).toBe(856);
    expect(regularPriceFor({ unitPrice: 599, regularPrice: null }, { price: 549, compareAtPrice: 856 })).toBeNull();
    expect(regularPriceFor({ unitPrice: 599, regularPrice: null }, null)).toBeNull();
  });
  it("ignores items that weren't on sale", () => {
    expect(regularPriceFor({ unitPrice: 599, regularPrice: null }, { price: 599, compareAtPrice: null })).toBeNull();
    expect(regularPriceFor({ unitPrice: 599, regularPrice: 599 }, null)).toBeNull();
  });
});

describe("saleSavings", () => {
  it("adds (regular − paid) × quantity", () => {
    expect(saleSavings([{ quantity: 2, unitPrice: 599, regular: 856 }, { quantity: 1, unitPrice: 499, regular: null }])).toBe(514);
  });
});
