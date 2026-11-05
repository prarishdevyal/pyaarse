import { formatINR } from "@/lib/format";

export function Totals({
  subtotal,
  discount = 0,
  couponCode,
  shipping,
  total,
  freeShippingThreshold,
}: {
  subtotal: number;
  discount?: number;
  couponCode?: string | null;
  shipping: number;
  total: number;
  freeShippingThreshold?: number;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
      {discount > 0 && (
        <div className="flex justify-between text-[#1f8f4e]">
          <dt>Discount{couponCode ? ` (${couponCode})` : ""}</dt><dd>−{formatINR(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
      {freeShippingThreshold !== undefined && shipping > 0 && (
        <p className="text-xs text-taupe">Add {formatINR(freeShippingThreshold - (subtotal - discount))} more for free shipping.</p>
      )}
      <div className="flex justify-between border-t border-sand/70 pt-3 text-base font-medium">
        <dt>Total</dt><dd className="text-brand">{formatINR(total)}</dd>
      </div>
    </dl>
  );
}
