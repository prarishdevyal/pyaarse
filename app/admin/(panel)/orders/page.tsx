import Link from "next/link";
import { releaseExpiredOrders } from "@/lib/orders";
import { requireAdmin } from "@/lib/auth";
import { and, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { cardTotals, likePattern, ordersHref, parseOrderFilters, rangeStart, statusesMatching } from "@/lib/order-filters";
import { OrdersManager } from "./orders-manager";
import { LiveRefresh } from "@/components/live-refresh";
import { OrderFiltersForm } from "./order-filters-form";

export const metadata = { title: "Orders" };

const { orders } = schema;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; range?: string }> }) {
  await requireAdmin();
  await releaseExpiredOrders();
  const f = parseOrderFilters(await searchParams);

  // Search and date apply to the cards too, so their numbers match what the list would show.
  const since = rangeStart(f.range);
  const scope: SQL[] = [];
  if (since) scope.push(gte(orders.createdAt, since));
  if (f.q) {
    const p = likePattern(f.q);
    const statuses = statusesMatching(f.q);
    scope.push(
      or(
        ilike(orders.orderNumber, p),
        ilike(orders.customerName, p),
        ilike(orders.phone, p),
        ilike(orders.email, p),
        ...(statuses.length ? [inArray(orders.status, statuses)] : []),
      )!,
    );
  }
  const listWhere = and(...scope, ...(f.status ? [eq(orders.status, f.status)] : []));

  const [rows, perStatus] = await Promise.all([
    db.select().from(orders).where(listWhere).orderBy(desc(orders.createdAt)).limit(200),
    db
      .select({ status: orders.status, n: count(), total: sql<number>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .where(and(...scope))
      .groupBy(orders.status),
  ]);
  const cards = cardTotals(perStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl text-brand">Orders</h1>
        <LiveRefresh />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const active = f.status === c.status;
          return (
            <Link
              key={c.label}
              href={ordersHref(f, { status: c.status })}
              aria-current={active ? "page" : undefined}
              className={`card p-4 transition ${active ? "border-2 border-brand bg-blush" : "bg-white hover:border-brand"}`}
            >
              <p className={`text-sm ${active ? "font-medium text-brand" : "text-taupe"}`}>{c.label}</p>
              <p className="mt-1 text-3xl font-medium tabular-nums">{c.n}</p>
              <p className="mt-1 text-xs text-taupe">{c.n ? formatINR(c.total) : c.hint}</p>
            </Link>
          );
        })}
      </div>

      <OrderFiltersForm filters={f} />

      {rows.length === 0 && (f.status || f.q || f.range !== "all") ? (
        <p className="py-8 text-center text-taupe">No orders match these filters.</p>
      ) : (
        <OrdersManager
          orders={rows.map((r) => ({ id: r.id, orderNumber: r.orderNumber, customerName: r.customerName, phone: r.phone, total: r.total, status: r.status, createdAt: r.createdAt, adminNote: r.adminNote }))}
        />
      )}
      {rows.length === 200 && <p className="text-center text-xs text-taupe">Showing the latest 200. Narrow the search or dates to see older ones.</p>}
    </div>
  );
}
