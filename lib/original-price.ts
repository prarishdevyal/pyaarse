/** Regular (pre-sale) price for an order line: what was recorded at checkout, else today's if it still sells at the same sale price. */
export function regularPriceFor(
  line: { unitPrice: number; regularPrice: number | null },
  current: { price: number; compareAtPrice: number | null } | null | undefined,
): number | null {
  if (line.regularPrice != null && line.regularPrice > line.unitPrice) return line.regularPrice;
  if (current && current.price === line.unitPrice && current.compareAtPrice != null && current.compareAtPrice > line.unitPrice) return current.compareAtPrice;
  return null;
}

/** Sale savings across an order (regular − paid, × quantity). Coupon discounts are separate. */
export const saleSavings = (lines: { quantity: number; unitPrice: number; regular: number | null }[]) =>
  lines.reduce((s, l) => s + (l.regular != null ? (l.regular - l.unitPrice) * l.quantity : 0), 0);
