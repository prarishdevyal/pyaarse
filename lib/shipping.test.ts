import { describe, expect, it } from "vitest";
import { chargeableGrams, codAvailability, codFee, DEFAULT_RATES, deliveryFee, orderTotals, slabs, withGst, type ShippingRates } from "./shipping";

const rates: ShippingRates = { ...DEFAULT_RATES, freeShippingThreshold: 0, codEnabled: true };
const box = (weightGrams: number | null, l: number | null, w: number | null, h: number | null, quantity = 1) => ({ quantity, weightGrams, lengthCm: l, widthCm: w, heightCm: h });

describe("chargeableGrams", () => {
  it("uses the real weight when it's more than the size weight", () => {
    expect(chargeableGrams([box(800, 10, 10, 10)])).toBe(800); // size weight 200 g
  });
  it("uses the size weight (L × W × H ÷ 5000 kg) for a big, light box", () => {
    expect(chargeableGrams([box(800, 25, 20, 10)])).toBe(1000);
  });
  it("adds up every item and quantity", () => {
    expect(chargeableGrams([box(300, 10, 10, 10, 2), box(500, 20, 10, 10)])).toBe(1100); // real 1100 g vs size 800 g
    expect(chargeableGrams([box(100, 20, 20, 10, 3)])).toBe(2400); // size 800 g each
  });
  it("counts items with nothing saved as nothing", () => {
    expect(chargeableGrams([box(null, null, null, null)])).toBe(0);
    expect(chargeableGrams([box(400, null, null, null)])).toBe(400);
  });
  it("handles one-decimal sizes without float noise", () => {
    expect(chargeableGrams([box(1, 24.5, 16.2, 6.1)])).toBe(484.218);
  });
});

describe("slabs", () => {
  it("rounds up to the next 0.5 kg, at least one slab", () => {
    expect(slabs(0)).toBe(1);
    expect(slabs(500)).toBe(1);
    expect(slabs(501)).toBe(2);
    expect(slabs(1000)).toBe(2);
    expect(slabs(3200)).toBe(7); // 3.2 kg is charged as 3.5 kg
  });
});

describe("withGst", () => {
  it("adds GST and rounds up to whole rupees", () => {
    expect(withGst(50, 18)).toBe(59);
    expect(withGst(80, 18)).toBe(95); // 94.40
    expect(withGst(40, 0)).toBe(40);
    expect(withGst(24.68, 18)).toBe(30); // 29.12
  });
});

describe("deliveryFee", () => {
  it("charges the first half kilo, then each extra half kilo, plus GST", () => {
    expect(deliveryFee(400, 500, rates)).toBe(59); // 50 × 1.18
    expect(deliveryFee(1000, 500, rates)).toBe(95); // (50 + 30) × 1.18 = 94.40
    expect(deliveryFee(3200, 500, rates)).toBe(272); // (50 + 6 × 30) × 1.18 = 271.40
  });
  it("is free from the free-shipping amount, and never free when that is 0", () => {
    const r = { ...rates, freeShippingThreshold: 999 };
    expect(deliveryFee(1000, 999, r)).toBe(0);
    expect(deliveryFee(1000, 998, r)).toBe(95);
    expect(deliveryFee(1000, 100000, rates)).toBe(95);
  });
  it("is nothing for an empty order", () => {
    expect(deliveryFee(1000, 0, rates)).toBe(0);
  });
});

describe("Cash on Delivery", () => {
  it("charges the flat fee or the percentage, whichever is more, plus GST", () => {
    expect(codFee(1000, rates)).toBe(48); // max(40, 20) = 40 → 47.20
    expect(codFee(3000, rates)).toBe(71); // max(40, 60) = 60 → 70.80
  });
  it("is only offered when switched on and within the order limits", () => {
    expect(codAvailability(500, { ...rates, codEnabled: false })).toMatchObject({ ok: false });
    expect(codAvailability(500, rates)).toEqual({ ok: true });
    const limited = { ...rates, codMinOrder: 300, codMaxOrder: 3000 };
    expect(codAvailability(299, limited)).toEqual({ ok: false, reason: "Cash on Delivery is available on orders of ₹300 or more." });
    expect(codAvailability(300, limited)).toEqual({ ok: true });
    expect(codAvailability(3000, limited)).toEqual({ ok: true });
    expect(codAvailability(3001, limited)).toEqual({ ok: false, reason: "Cash on Delivery is available on orders up to ₹3,000." });
  });
});

describe("orderTotals", () => {
  it("adds delivery for online orders, and the COD charge for COD orders", () => {
    expect(orderTotals({ subtotal: 800, discount: 0, grams: 1000, method: "online" }, rates)).toEqual({ subtotal: 800, discount: 0, shipping: 95, codFee: 0, total: 895 });
    expect(orderTotals({ subtotal: 800, discount: 0, grams: 1000, method: "cod" }, rates)).toEqual({ subtotal: 800, discount: 0, shipping: 95, codFee: 48, total: 943 });
  });
  it("judges free delivery and the COD percentage on the items after discount, and keeps the COD charge when delivery is free", () => {
    const r = { ...rates, freeShippingThreshold: 999 };
    expect(orderTotals({ subtotal: 1100, discount: 200, grams: 1000, method: "cod" }, r)).toEqual({ subtotal: 1100, discount: 200, shipping: 95, codFee: 48, total: 1043 });
    expect(orderTotals({ subtotal: 3100, discount: 100, grams: 1000, method: "cod" }, r)).toEqual({ subtotal: 3100, discount: 100, shipping: 0, codFee: 71, total: 3071 });
  });
});
