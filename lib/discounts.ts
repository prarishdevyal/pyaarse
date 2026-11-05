import { calcShipping, type ShippingSettings } from "./pricing";
import { formatINR } from "./format";

export type CouponRule = {
  code: string;
  kind: "percent" | "flat";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export const normalizeCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

/** Rupees off the subtotal for a coupon, or why it can't be used. */
export function couponDiscount(c: CouponRule | null | undefined, subtotal: number, now = new Date()): { ok: true; discount: number } | { ok: false; error: string } {
  if (!c || !c.isActive) return { ok: false, error: "That code isn't valid." };
  if (c.expiresAt && c.expiresAt.getTime() <= now.getTime()) return { ok: false, error: "That code has expired." };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { ok: false, error: "That code has been fully used." };
  if (subtotal < c.minSubtotal) return { ok: false, error: `Add ${formatINR(c.minSubtotal - subtotal)} more to use ${c.code}.` };
  let discount = c.kind === "percent" ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.kind === "percent" && c.maxDiscount !== null) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, subtotal);
  return discount > 0 ? { ok: true, discount } : { ok: false, error: "That code doesn't apply to this order." };
}

/** Order totals after a discount. Free shipping is judged on what the customer pays for the items. */
export function totalsWithDiscount(subtotal: number, discount: number, s: ShippingSettings) {
  const shipping = calcShipping(subtotal - discount, s);
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

/** A short description for the admin and checkout, e.g. "10% off (up to ₹200) on ₹999+". */
export function describeCoupon(c: Pick<CouponRule, "kind" | "value" | "minSubtotal" | "maxDiscount">): string {
  const off = c.kind === "percent" ? `${c.value}% off${c.maxDiscount !== null ? ` (up to ${formatINR(c.maxDiscount)})` : ""}` : `${formatINR(c.value)} off`;
  return c.minSubtotal > 0 ? `${off} on ${formatINR(c.minSubtotal)}+` : off;
}

/** A variant is on sale when its regular price is higher than what it sells for. */
export const isOnSale = (v: { price: number; compareAtPrice: number | null }) => v.compareAtPrice !== null && v.compareAtPrice > v.price;

export const percentOff = (v: { price: number; compareAtPrice: number | null }) =>
  isOnSale(v) ? Math.round(((v.compareAtPrice! - v.price) / v.compareAtPrice!) * 100) : 0;

/** Admin enters regular + optional sale price; stored as price (what customers pay) + compare-at. */
export function toStoredPrices(regular: number, sale: number | null): { price: number; compareAtPrice: number | null } {
  return sale !== null && sale < regular ? { price: sale, compareAtPrice: regular } : { price: regular, compareAtPrice: null };
}

export function fromStoredPrices(v: { price: number; compareAtPrice: number | null }): { regular: number; sale: number | null } {
  return isOnSale(v) ? { regular: v.compareAtPrice!, sale: v.price } : { regular: v.price, sale: null };
}

/** A coupon's last day (YYYY-MM-DD) → the moment it stops working: the end of that day in India. */
export function expiryFromDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T23:59:59.999+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}
