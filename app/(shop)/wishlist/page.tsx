"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchProductCards } from "@/app/actions";
import { ProductCard } from "@/components/product-card";
import { useWishlist } from "@/components/wishlist-provider";
import type { ProductCard as Card } from "@/lib/catalog";

export default function WishlistPage() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState<Card[] | null>(null);
  const key = [...ids].sort().join(",");

  useEffect(() => {
    if (!key) return setProducts([]);
    fetchProductCards(key.split(",").map(Number)).then(setProducts).catch(() => setProducts([]));
  }, [key]);

  const visible = products?.filter((p) => ids.includes(p.id));

  return (
    <div className="container-page py-12">
      <h1 className="heading-section">Your Wishlist</h1>
      {visible === undefined ? null : visible.length === 0 ? (
        <div className="mt-8">
          <p className="text-taupe">Tap the heart on any candle to save it here.</p>
          <Link href="/shop" className="btn-primary mt-6">Browse candles</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
