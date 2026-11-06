import Link from "next/link";
import { releaseExpiredOrders } from "@/lib/orders";
import { startOfIndianDay } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { AdminOrdersTable } from "@/components/admin-orders-table";
import { getStockRows } from "@/lib/stock-data";
import { LOW_STOCK, stockSummary } from "@/lib/stock";

const { orders, products, productVariants } = schema;

export default async function AdminDashboard() {
  await requireAdmin();
  // Unpaid orders past their time are cancelled before counting, so the numbers are current.
  await releaseExpiredOrders();
  const startOfDay = startOfIndianDay();

  const [[pending], [today], recent, lowStock] = await Promise.all([
    db.select({ n: count() }).from(orders).where(eq(orders.status, "pending_payment")),
    db.select({ n: count(), revenue: sql<number>`coalesce(sum(${orders.total}), 0)` }).from(orders)
      .where(and(gte(orders.createdAt, startOfDay), sql`${orders.status} <> 'cancelled'`)),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db.select({ productId: products.id, productName: products.name, variantName: productVariants.name, stock: productVariants.stock })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(products.isActive, true), lte(productVariants.stock, 3)))
      .orderBy(productVariants.stock),
  ]);

  const stockRows = await getStockRows();
  const stock = stockSummary(stockRows);
  const lowest = stockRows.filter((r) => r.visible).slice(0, 5);

  const stats = [
    { label: "Awaiting payment", value: pending.n, href: "/orders?status=pending_payment" },
    { label: "Orders today", value: today.n, href: "/orders" },
    { label: "Revenue today", value: `₹${Number(today.revenue).toLocaleString("en-IN")}`, href: "/orders" },
    { label: "Low stock variants", value: lowStock.length, href: "/stock?show=low" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl text-brand">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card bg-white p-5 hover:border-brand">
            <p className="text-sm text-taupe">{s.label}</p>
            <p className="mt-1 text-3xl font-medium">{s.value}</p>
          </Link>
        ))}
      </div>

      <section className="card bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">Stock left</h2>
            <p className="mt-1 text-3xl font-medium">{stock.units} <span className="text-base font-normal text-taupe">units across {stock.options} options</span></p>
            <p className="mt-1 text-sm">
              <span className={stock.out ? "font-medium text-brand" : "text-taupe"}>{stock.out} out of stock</span>
              <span className="text-taupe"> · </span>
              <span className={stock.low ? "font-medium text-amber-800" : "text-taupe"}>{stock.low} running low</span>
            </p>
          </div>
          <Link href="/stock" className="btn-secondary shrink-0">View all stock</Link>
        </div>
        {lowest.length > 0 && (
          <ul className="mt-4 divide-y divide-sand/40 border-t border-sand/40 text-sm">
            {lowest.map((v) => (
              <li key={v.variantId} className="flex justify-between gap-3 py-2">
                <Link href={`/products/${v.productId}`} className="hover:text-brand">{v.name} · {v.option}</Link>
                <span className={v.stock === 0 ? "font-medium text-brand" : v.stock <= LOW_STOCK ? "font-medium text-amber-800" : ""}>
                  {v.stock === 0 ? "Out of stock" : `${v.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Recent orders</h2>
          <Link href="/orders" className="text-sm text-brand hover:underline">All orders →</Link>
        </div>
        <AdminOrdersTable orders={recent} />
      </section>
    </div>
  );
}
