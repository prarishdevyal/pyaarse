"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mergeWishlist, toggleWishlist } from "@/app/actions";

type WishlistCtx = { ids: number[]; has: (id: number) => boolean; toggle: (id: number) => void };

const KEY = "pyaarse_wishlist";
const Ctx = createContext<WishlistCtx | null>(null);

function readLocal(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeLocal(ids: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
}

/** Guests: wishlist lives in localStorage. Logged in: stored in the DB (guest items merged on login). */
export function WishlistProvider({ loggedIn, serverIds, children }: { loggedIn: boolean; serverIds: number[]; children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>(serverIds);

  useEffect(() => {
    const local = readLocal();
    if (!loggedIn) {
      setIds(local);
      return;
    }
    if (local.length) {
      writeLocal([]);
      mergeWishlist(local).then(setIds).catch(() => {});
    } else {
      setIds(serverIds);
    }
  }, [loggedIn, serverIds]);

  const toggle = useCallback(
    (id: number) => {
      setIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        if (!loggedIn) writeLocal(next);
        return next;
      });
      if (loggedIn) toggleWishlist(id).catch(() => {});
    },
    [loggedIn],
  );

  const value = useMemo(() => ({ ids, has: (id: number) => ids.includes(id), toggle }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
