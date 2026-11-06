/** "Low" means this many units or fewer (but not zero). Used by the dashboard and the Stock page. */
export const LOW_STOCK = 3;

export type StockStatus = "out" | "low" | "ok";
export const stockStatus = (units: number): StockStatus => (units <= 0 ? "out" : units <= LOW_STOCK ? "low" : "ok");
export const STOCK_LABEL: Record<StockStatus, string> = { out: "Out of stock", low: "Low", ok: "In stock" };

/** Totals for the dashboard card. Only options of products visible in the shop count. */
export function stockSummary(rows: { stock: number; visible: boolean }[]) {
  const live = rows.filter((r) => r.visible);
  return {
    units: live.reduce((s, r) => s + Math.max(0, r.stock), 0),
    options: live.length,
    low: live.filter((r) => stockStatus(r.stock) === "low").length,
    out: live.filter((r) => stockStatus(r.stock) === "out").length,
  };
}

export type StockFilter = "all" | "low" | "out";
export const isStockFilter = (s: unknown): s is StockFilter => s === "all" || s === "low" || s === "out";

/** Lowest stock first; "low" shows low and out, "out" shows only out of stock. */
export function filterStock<T extends { stock: number; name: string }>(rows: T[], filter: StockFilter): T[] {
  const keep = (r: T) => filter === "all" || (filter === "out" ? stockStatus(r.stock) === "out" : stockStatus(r.stock) !== "ok");
  return rows.filter(keep).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
}
