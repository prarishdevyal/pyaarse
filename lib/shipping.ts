import { formatINR } from "./format";

/** Delivery and Cash on Delivery charges, set by the admin from the Delhivery rate card. Rupees, percents as numbers (18 = 18%). */
export type ShippingRates = {
  /** Charge for the first 0.5 kg. */
  baseRate: number;
  /** Charge for each further 0.5 kg. */
  slabRate: number;
  gstPercent: number;
  /** Items at or above this amount ship free; 0 = never free. */
  freeShippingThreshold: number;
  codEnabled: boolean;
  codFlatFee: number;
  codPercent: number;
  /** COD only for item totals within these amounts; 0 = no limit. */
  codMinOrder: number;
  codMaxOrder: number;
};

export const DEFAULT_RATES: ShippingRates = {
  baseRate: 50,
  slabRate: 30,
  gstPercent: 18,
  freeShippingThreshold: 999,
  codEnabled: false,
  codFlatFee: 40,
  codPercent: 2,
  codMinOrder: 0,
  codMaxOrder: 0,
};

export type PaymentMethod = "online" | "cod";

export type ParcelLine = {
  quantity: number;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
};

const SLAB_GRAMS = 500;

/**
 * What the courier charges by: the real weight or the size weight (L × W × H ÷ 5000 kg), whichever is more.
 * An item with no weight or size saved adds nothing, so the order still gets at least the first-slab charge.
 */
export function chargeableGrams(lines: ParcelLine[]): number {
  let actual = 0;
  let volumetric = 0;
  for (const l of lines) {
    actual += (l.weightGrams ?? 0) * l.quantity;
    if (l.lengthCm != null && l.widthCm != null && l.heightCm != null) volumetric += ((l.lengthCm * l.widthCm * l.heightCm) / 5) * l.quantity;
  }
  // Sizes have one decimal, so keep the size weight to a whole gram before comparing.
  return Math.max(actual, Math.round(volumetric * 1000) / 1000);
}

/** Number of 0.5 kg slabs charged: 3.2 kg is charged as 3.5 kg (7 slabs). At least one. */
export const slabs = (grams: number) => Math.max(1, Math.ceil(grams / SLAB_GRAMS));

/** An amount plus GST, rounded up to a whole rupee. Worked in paise so 50 × 1.18 is exactly 59. */
export function withGst(amount: number, gstPercent: number): number {
  return Math.ceil(Math.round(amount * (100 + gstPercent) * 100) / 10000);
}

/** Delivery charge for a parcel, with GST. Free once the items (after discount) reach the free-shipping amount. */
export function deliveryFee(grams: number, itemsTotal: number, r: ShippingRates): number {
  if (itemsTotal <= 0) return 0;
  if (r.freeShippingThreshold > 0 && itemsTotal >= r.freeShippingThreshold) return 0;
  return withGst(r.baseRate + (slabs(grams) - 1) * r.slabRate, r.gstPercent);
}

/** Whether Cash on Delivery can be used for items worth this much, and why not. */
export function codAvailability(itemsTotal: number, r: ShippingRates): { ok: true } | { ok: false; reason: string } {
  if (!r.codEnabled) return { ok: false, reason: "Cash on Delivery isn't available right now." };
  if (r.codMinOrder > 0 && itemsTotal < r.codMinOrder) return { ok: false, reason: `Cash on Delivery is available on orders of ${formatINR(r.codMinOrder)} or more.` };
  if (r.codMaxOrder > 0 && itemsTotal > r.codMaxOrder) return { ok: false, reason: `Cash on Delivery is available on orders up to ${formatINR(r.codMaxOrder)}.` };
  return { ok: true };
}

/** Cash on Delivery charge: the flat fee or the percentage of the items, whichever is more, with GST. Charged even when delivery is free. */
export function codFee(itemsTotal: number, r: ShippingRates): number {
  return withGst(Math.max(r.codFlatFee, (itemsTotal * r.codPercent) / 100), r.gstPercent);
}

export type OrderTotals = { subtotal: number; discount: number; shipping: number; codFee: number; total: number };

/** The order's money: items, discount, delivery and (for COD) the COD charge. */
export function orderTotals(o: { subtotal: number; discount: number; grams: number; method: PaymentMethod }, r: ShippingRates): OrderTotals {
  const items = o.subtotal - o.discount;
  const shipping = deliveryFee(o.grams, items, r);
  const cod = o.method === "cod" ? codFee(items, r) : 0;
  return { subtotal: o.subtotal, discount: o.discount, shipping, codFee: cod, total: items + shipping + cod };
}
