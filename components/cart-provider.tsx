"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  variantId: number;
  productSlug: string;
  productName: string;
  variantName: string;
  price: number;
  image: string;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQuantity: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
};

const KEY = "pyaarse_cart";
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.variantId === item.variantId);
      if (found) return prev.map((i) => (i.variantId === item.variantId ? { ...i, quantity: i.quantity + qty } : i));
      return [...prev, { ...item, quantity: qty }];
    });
  }, []);

  const setQuantity = useCallback((variantId: number, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.variantId !== variantId) : prev.map((i) => (i.variantId === variantId ? { ...i, quantity: qty } : i)),
    );
  }, []);

  const remove = useCallback((variantId: number) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, ready, count: items.reduce((n, i) => n + i.quantity, 0), add, setQuantity, remove, clear }),
    [items, ready, add, setQuantity, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
