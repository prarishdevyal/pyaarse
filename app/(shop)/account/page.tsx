import { desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const orders = await db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt));
  const items = orders.length
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orders.map((o) => o.id)))
    : [];

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading-section">Hi, {user.name.split(" ")[0]}</h1>
          <p className="text-taupe">{user.email}</p>
        </div>
        <form action={logout}><button className="btn-secondary">Log out</button></form>
      </div>

      <h2 className="mt-10 font-serif text-3xl">Your orders</h2>
      {orders.length === 0 ? (
        <p className="mt-4 text-taupe">You haven&apos;t placed any orders yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Order {o.orderNumber}</p>
                  <p className="text-sm text-taupe">{formatDate(o.createdAt)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <ul className="mt-4 space-y-1 text-sm">
                {items.filter((i) => i.orderId === o.id).map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>{i.productName} <span className="text-taupe">({i.variantName}) × {i.quantity}</span></span>
                    <span>{formatINR(i.unitPrice * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-sand/60 pt-3 text-right font-medium">Total {formatINR(o.total)}</p>
              {o.status === "pending_payment" && (
                <p className="mt-2 text-sm text-taupe">We&apos;ll send a payment QR to your WhatsApp ({o.phone}) shortly.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
