"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { HeartIcon } from "@/components/icons";
import { formatINR } from "@/lib/format";
import { MAX_QTY_PER_VARIANT } from "@/lib/pricing";

type Variant = { id: number; name: string; price: number; stock: number };

export function AddToCart({ product, variants }: { product: { id: number; name: string; slug: string; image: string }; variants: Variant[] }) {
  const { add, items } = useCart();
  const { has, toggle } = useWishlist();
  const [selectedId, setSelectedId] = useState(variants.find((v) => v.stock > 0)?.id ?? variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const selected = variants.find((v) => v.id === selectedId);

  if (!selected) return <p className="mt-6 text-taupe">Coming soon.</p>;

  const inCart = items.find((i) => i.variantId === selected.id)?.quantity ?? 0;
  const maxQty = Math.max(0, Math.min(selected.stock, MAX_QTY_PER_VARIANT) - inCart);

  function onAdd() {
    if (!selected || qty > maxQty) return;
    add({ variantId: selected.id, productSlug: product.slug, productName: product.name, variantName: selected.name, price: selected.price, image: product.image }, qty);
    setQty(1);
    setAdded(true);
    setAddedCount((n) => n + 1);
  }

  return (
    <div className="mt-4">
      <p className="text-2xl font-medium">{formatINR(selected.price)}</p>

      {variants.length > 1 && (
        <div className="mt-6">
          <p className="label">Choose an option</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => { setSelectedId(v.id); setQty(1); setAdded(false); }}
                disabled={v.stock === 0}
                className={`rounded-xl border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                  v.id === selectedId ? "border-brand bg-blush text-brand" : "border-sand hover:border-brand"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-taupe">
        {selected.stock === 0 ? "Out of stock" : selected.stock <= 5 ? `Only ${selected.stock} left` : "In stock"}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-sand">
          <button className="px-4 py-3 disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease">−</button>
          <span className="w-8 text-center">{qty}</span>
          <button className="px-4 py-3 disabled:opacity-40" onClick={() => setQty((q) => q + 1)} disabled={qty >= maxQty} aria-label="Increase">+</button>
        </div>
        <button className="btn-primary flex-1 sm:flex-none sm:px-12" onClick={onAdd} disabled={maxQty === 0}>
          {selected.stock === 0 ? "Out of stock" : maxQty === 0 ? "Limit reached in cart" : "Add to Cart"}
        </button>
        <button
          onClick={() => toggle(product.id)}
          aria-label="Wishlist"
          aria-pressed={has(product.id)}
          className="rounded-full border border-sand p-3 text-brand hover:border-brand"
        >
          <HeartIcon key={String(has(product.id))} width={20} height={20} filled={has(product.id)} className={has(product.id) ? "anim-pop" : undefined} />
        </button>
      </div>

      {added && (
        <p key={addedCount} className="anim-drop mt-4 text-sm" role="status">
          Added to your cart. <Link href="/cart" className="text-brand underline">View cart →</Link>
        </p>
      )}
    </div>
  );
}
