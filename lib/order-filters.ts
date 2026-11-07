import type { OrderStatus } from "./db/schema";
import { startOfIndianDay } from "./format";
import { isOrderStatus } from "./order-status";

/** The status cards on the admin Orders page, in workflow order. "paid" is shown as Processing: paid, not shipped yet. */
export const ORDER_CARDS: { status: OrderStatus | null; label: string; hint: string }[] = [
  { status: null, label: "All orders", hint: "Everything" },
  { status: "pending_payment", label: "Awaiting payment", hint: "Not paid yet" },
  { status: "paid", label: "Processing", hint: "Paid, to pack and ship" },
  { status: "shipped", label: "Shipped", hint: "On the way" },
  { status: "delivered", label: "Delivered", hint: "Done" },
  { status: "cancelled", label: "Cancelled", hint: "Stock returned" },
];

export const DATE_RANGES = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
] as const;
export type DateRange = (typeof DATE_RANGES)[number]["key"];

export type OrderFilters = { status: OrderStatus | null; q: string; range: DateRange };

/** Reads the Orders page URL (?status=&q=&range=); anything unknown falls back to "show everything". */
export function parseOrderFilters(p: { status?: string; q?: string; range?: string }): OrderFilters {
  const range = DATE_RANGES.find((r) => r.key === p.range)?.key ?? "all";
  return { status: isOrderStatus(p.status) ? p.status : null, q: (p.q ?? "").trim().slice(0, 100), range };
}

/** Start of the chosen period (Indian days), or null for all time. */
export function rangeStart(range: DateRange, now = new Date()): Date | null {
  if (range === "all") return null;
  const today = startOfIndianDay(now);
  const days = range === "today" ? 0 : range === "7d" ? 6 : 29;
  return new Date(today.getTime() - days * 86_400_000);
}

/** URL for the Orders page with some filters changed, keeping the rest. */
export function ordersHref(f: OrderFilters, change: Partial<OrderFilters> = {}): string {
  const next = { ...f, ...change };
  const qs = new URLSearchParams();
  if (next.status) qs.set("status", next.status);
  if (next.q) qs.set("q", next.q);
  if (next.range !== "all") qs.set("range", next.range);
  const s = qs.toString();
  return s ? `/orders?${s}` : "/orders";
}

/** Statuses a search word refers to, so typing "shipped" or "processing" finds those orders too. */
export function statusesMatching(q: string): OrderStatus[] {
  const word = q.trim().toLowerCase();
  if (word.length < 3) return [];
  return ORDER_CARDS.flatMap((c) =>
    c.status && [c.label, c.status.replace("_", " "), c.hint].some((t) => t.toLowerCase().includes(word)) ? [c.status] : [],
  );
}

/** Escapes % and _ so a search is matched literally inside ILIKE. */
export const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Per-status counts and totals → the numbers for each card (All = every status together). */
export function cardTotals(rows: { status: OrderStatus; n: number; total: number }[]) {
  const by = new Map(rows.map((r) => [r.status, r]));
  const all = rows.reduce((a, r) => ({ n: a.n + Number(r.n), total: a.total + Number(r.total) }), { n: 0, total: 0 });
  return ORDER_CARDS.map((c) => {
    const r = c.status ? by.get(c.status) : all;
    return { ...c, n: Number(r?.n ?? 0), total: Number(r?.total ?? 0) };
  });
}

