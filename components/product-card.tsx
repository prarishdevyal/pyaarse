"use client";

import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import { useWishlist } from "./wishlist-provider";
import { HeartIcon } from "./icons";

export function ProductCard({ product }: { product: Card }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  return (
    <div className="group card overflow-hidden bg-white/70">
      <div className="relative aspect-square overflow-hidden bg-blush">
        <Link href={`/product/${product.slug}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        </Link>
        <button
          onClick={() => toggle(product.id)}
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={saved}
          className="absolute right-3 top-3 rounded-full bg-ivory/90 p-2 text-brand shadow-soft transition hover:scale-110"
        >
          <HeartIcon key={String(saved)} width={18} height={18} filled={saved} className={saved ? "anim-pop" : undefined} />
        </button>
        {!product.inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-charcoal/80 px-3 py-1 text-xs text-ivory">Out of stock</span>
        )}
      </div>
      <Link href={`/product/${product.slug}`} className="block p-4">
        <p className="font-serif text-xl leading-tight">{product.name}</p>
        <p className="mt-1 text-sm text-taupe">
          {product.minPrice === null ? "Coming soon" : `From ${formatINR(product.minPrice)}`}
        </p>
      </Link>
    </div>
  );
}
