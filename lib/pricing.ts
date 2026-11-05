/** Max units of one variant per order (applied after duplicate lines are merged). */
export const MAX_QTY_PER_VARIANT = 10;
export const MAX_CART_LINES = 30;

export type ShippingSettings = { shippingFee: number; freeShippingThreshold: number };

export type CartLine = { variantId: number; quantity: number };

export type VariantInfo = {
  id: number;
  productId: number;
  productName: string;
  variantName: string;
  price: number;
  stock: number;
  isActive: boolean;
};

export type PricedLine = {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export function calcShipping(subtotal: number, s: ShippingSettings): number {
  if (subtotal <= 0) return 0;
  return subtotal >= s.freeShippingThreshold ? 0 : s.shippingFee;
}

/** Merges duplicate lines, prices them from server data and checks stock. */
export function priceCart(
  lines: CartLine[],
  variants: VariantInfo[],
  s: ShippingSettings,
): { ok: true; lines: PricedLine[]; subtotal: number; shipping: number; total: number } | { ok: false; error: string } {
  const merged = new Map<number, number>();
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) return { ok: false, error: "Invalid quantity in cart." };
    const qty = (merged.get(l.variantId) ?? 0) + l.quantity;
    if (qty > MAX_QTY_PER_VARIANT) return { ok: false, error: `You can order at most ${MAX_QTY_PER_VARIANT} of each item.` };
    merged.set(l.variantId, qty);
  }
  if (merged.size === 0) return { ok: false, error: "Your cart is empty." };

  const byId = new Map(variants.map((v) => [v.id, v]));
  const priced: PricedLine[] = [];
  for (const [variantId, quantity] of merged) {
    const v = byId.get(variantId);
    if (!v || !v.isActive) return { ok: false, error: "An item in your cart is no longer available." };
    if (v.stock < quantity) {
      return {
        ok: false,
        error: v.stock === 0
          ? `${v.productName} (${v.variantName}) is out of stock.`
          : `Only ${v.stock} left of ${v.productName} (${v.variantName}).`,
      };
    }
    priced.push({
      variantId,
      productId: v.productId,
      productName: v.productName,
      variantName: v.variantName,
      unitPrice: v.price,
      quantity,
      lineTotal: v.price * quantity,
    });
  }
  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = calcShipping(subtotal, s);
  return { ok: true, lines: priced, subtotal, shipping, total: subtotal + shipping };
}
