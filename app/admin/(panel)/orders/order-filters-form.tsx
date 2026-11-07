"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DATE_RANGES, ordersHref, type DateRange, type OrderFilters } from "@/lib/order-filters";

/** Search and date for the Orders page. Results update as you type (after a short pause) or pick a date. */
export function OrderFiltersForm({ filters }: { filters: OrderFilters }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [pending, start] = useTransition();
  const first = useRef(true);

  const go = (change: Partial<OrderFilters>) => start(() => router.replace(ordersHref(filters, change), { scroll: false }));

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => go({ q: q.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-end gap-3" aria-busy={pending}>
      <div className="min-w-56 flex-1">
        <label htmlFor="q" className="label">Search</label>
        <input
          id="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Order number, name, phone, email or status"
          className="input"
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="range" className="label">Date</label>
        <select id="range" value={filters.range} onChange={(e) => go({ range: e.target.value as DateRange })} className="input">
          {DATE_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </div>
      {(filters.q || filters.range !== "all" || filters.status) && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            start(() => router.replace("/orders", { scroll: false }));
          }}
          className="btn-secondary"
        >
          Clear filters
        </button>
      )}
      <span className="w-full text-xs text-taupe" role="status">{pending ? "Updating…" : " "}</span>
    </div>
  );
}
