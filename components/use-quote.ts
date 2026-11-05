"use client";

import { useEffect, useState } from "react";
import { quoteCart } from "@/app/actions";
import type { CartItem } from "./cart-provider";

type Quote = Awaited<ReturnType<typeof quoteCart>>;

/** Fetches authoritative prices, shipping and stock for the cart from the server. */
export function useQuote(items: CartItem[], ready: boolean) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const key = items.map((i) => `${i.variantId}x${i.quantity}`).join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    quoteCart(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })))
      .then((q) => !cancelled && setQuote(q))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return quote;
}
