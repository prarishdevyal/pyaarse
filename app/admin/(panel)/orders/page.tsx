import Link from "next/link";
import { releaseExpiredOrders } from "@/lib/orders";
import { requireAdmin } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/db/schema";
import { STATUS_LABELS } from "@/lib/format";
import { isOrderStatus } from "@/lib/order-status";
import { AdminOrdersTable } from "@/components/admin-orders-table";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  await releaseExpiredOrders();
  const { status } = await searchParams;
  const filter = isOrderStatus(status) ? status : undefined;
  const rows = await db
    .select()
    .from(schema.orders)
    .where(filter ? eq(schema.orders.status, filter) : undefined)
    .orderBy(desc(schema.orders.createdAt))
    .limit(200);
  const pill = (active: boolean) => `rounded-full border px-3 py-1 text-sm ${active ? "border-brand bg-brand text-ivory" : "border-sand bg-white hover:border-brand"}`;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-brand">Orders</h1>
      <div className="flex flex-wrap gap-2">
        <Link href="/orders" className={pill(!filter)}>All</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/orders?status=${s}`} className={pill(filter === s)}>{STATUS_LABELS[s]}</Link>
        ))}
      </div>
      <AdminOrdersTable orders={rows} />
    </div>
  );
}
