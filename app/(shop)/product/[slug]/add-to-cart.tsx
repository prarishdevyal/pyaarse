"use client";

import Link from "next/link";
import { useSiteText } from "@/components/site-text";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { HeartIcon } from "@/components/icons";
import { AnimatedCount } from "@/components/animated-count";
import { formatINR } from "@/lib/format";
import { MAX_QTY_PER_VARIANT } from "@/lib/pricing";
import { isOnSale, percentOff } from "@/lib/discounts";
import { groupVariants, variantLabel } from "@/lib/variants";

type Variant = { id: number; name: string; subName: string; price: number; compareAtPrice: number | null; stock: number };

export function AddToCart({ product, variants }: { product: { id: number; name: string; slug: string; image: string }; variants: Variant[] }) {
  const { add, items, setQuantity } = useCart();
  const t = useSiteText();
  const { has, toggle } = useWishlist();
  const [selectedId, setSelectedId] = useState(variants.find((v) => v.stock > 0)?.id ?? variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const selected = variants.find((v) => v.id === selectedId);
  // Variant first (Box of 4), then its sub-variants (Rose, Oud…); each sub-variant has its own price and stock.
  const groups = groupVariants(variants);
  const group = groups.find((g) => g.name === selected?.name);
  const choose = (id: number) => { setSelectedId(id); setQty(1); setAdded(false); };

  if (!selected) return <p className="mt-6 text-taupe">{t("product.comingSoon")}</p>;

  const inCart = items.find((i) => i.variantId === selected.id)?.quantity ?? 0;
  const limit = Math.min(selected.stock, MAX_QTY_PER_VARIANT);
  const maxQty = Math.max(0, limit - inCart);
  // Once this option is in the cart, the counter edits the cart quantity (down to 0 removes it).
  const shown = inCart > 0 ? inCart : qty;
  const dec = () => (inCart > 0 ? setQuantity(selected.id, inCart - 1) : setQty((q) => Math.max(1, q - 1)));
  const inc = () => (inCart > 0 ? setQuantity(selected.id, Math.min(limit, inCart + 1)) : setQty((q) => q + 1));

  function onAdd() {
    if (!selected || qty > maxQty) return;
    add({ variantId: selected.id, productSlug: product.slug, productName: product.name, variantName: variantLabel(selected.name, selected.subName), price: selected.price, image: product.image }, qty);
    setQty(1);
    setAdded(true);
  }

  return (
    <div className="mt-4">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-2xl font-medium ${isOnSale(selected) ? "text-brand" : ""}`}>{formatINR(selected.price)}</span>
        {isOnSale(selected) && (
          <>
            <s className="text-lg text-taupe">{formatINR(selected.compareAtPrice!)}</s>
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-ivory">{percentOff(selected)}% off</span>
          </>
        )}
      </p>

      {groups.length > 1 && (
        <div className="mt-6">
          <p className="label">{t("product.chooseOption")}</p>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const inStock = g.options.find((o) => o.stock > 0);
              return (
                <button
                  key={g.name}
                  onClick={() => choose((inStock ?? g.options[0]).id)}
                  disabled={!inStock}
                  aria-pressed={g.name === selected.name}
                  className={`rounded-xl border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                    g.name === selected.name ? "border-brand bg-blush text-brand" : "border-sand hover:border-brand"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {group && group.options.some((o) => o.subName) && (
        <div className="mt-5">
          <p className="label">{groups.length > 1 ? `Choose ${group.name}` : t("product.chooseOption")}</p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((o) => (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                disabled={o.stock === 0}
                aria-pressed={o.id === selectedId}
                className={`rounded-xl border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                  o.id === selectedId ? "border-brand bg-blush text-brand" : "border-sand hover:border-brand"
                }`}
              >
                {o.subName || group.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-taupe">
        {selected.stock === 0 ? t("product.outOfStock") : selected.stock <= 5 ? t("product.lowStock", { n: selected.stock }) : t("product.inStock")}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-sand">
          <button className="step-btn px-4 py-3 disabled:opacity-40" onClick={dec} disabled={inCart === 0 && qty <= 1} aria-label="Decrease">−</button>
          <AnimatedCount value={shown} className="w-8" />
          <button className="step-btn px-4 py-3 disabled:opacity-40" onClick={inc} disabled={inCart > 0 ? inCart >= limit : qty >= maxQty} aria-label="Increase">+</button>
        </div>
        {inCart > 0 ? (
          <Link href="/cart" className="btn-primary flex-1 text-center sm:flex-none sm:px-12">
            {t("product.viewCart").replace(/\s*→\s*$/, "")}
          </Link>
        ) : (
          <button className="btn-primary flex-1 sm:flex-none sm:px-12" onClick={onAdd} disabled={maxQty === 0}>
            {selected.stock === 0 ? t("product.outOfStock") : maxQty === 0 ? t("product.limitReached") : t("product.addToCart")}
          </button>
        )}
        <button
          onClick={() => toggle(product.id)}
          aria-label="Wishlist"
          aria-pressed={has(product.id)}
          className="rounded-full border border-sand p-3 text-brand hover:border-brand"
        >
          <HeartIcon key={String(has(product.id))} width={20} height={20} filled={has(product.id)} className={has(product.id) ? "anim-pop" : undefined} />
        </button>
      </div>

      {/* Screen readers still hear the confirmation; sighted users see the button change. */}
      <p className="sr-only" role="status">
        {added ? t("product.added") : ""}
      </p>
    </div>
  );
}
