"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LIVE_REFRESH_MS, updatedAgo } from "@/lib/live";

/**
 * Keeps an admin page up to date: fetches fresh data every 20 s while the tab is visible, and right away
 * when you come back to it. Only the server data refreshes; ticked boxes, typed notes and filters stay.
 */
export function LiveRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [last, setLast] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const lastRef = useRef(last);

  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      start(() => router.refresh());
      lastRef.current = Date.now();
      setLast(lastRef.current);
    };
    const tick = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - lastRef.current >= LIVE_REFRESH_MS) refresh();
    }, 1000);
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastRef.current > 3000) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-3 py-1 text-xs text-taupe" role="status" aria-live="off">
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
      </span>
      Live · {pending ? "updating…" : `updated ${updatedAgo(now - last)}`}
    </span>
  );
}
