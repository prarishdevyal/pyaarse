import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { describeCoupon } from "@/lib/discounts";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteCoupon, setCouponActive } from "../../actions";
import { CouponForm } from "./coupon-form";

export const metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  await requireAdmin();
  const coupons = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt));
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-brand">Coupons</h1>
        <p className="mt-1 text-sm text-taupe">Codes customers enter at checkout. For a sale on one product, set a sale price on the product instead.</p>
      </div>

      <section className="card bg-white p-5">
        <h2 className="font-serif text-2xl">New coupon</h2>
        <CouponForm />
      </section>

      {coupons.length === 0 ? (
        <p className="text-sm text-taupe">No coupons yet.</p>
      ) : (
        <div className="card overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-sand/60 text-left text-taupe">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Used</th>
                <th className="px-4 py-3 font-medium">Valid until</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/40">
              {coupons.map((c) => {
                const expired = !!c.expiresAt && c.expiresAt.getTime() <= now;
                const usedUp = c.usageLimit !== null && c.usedCount >= c.usageLimit;
                const status = !c.isActive ? "Off" : expired ? "Expired" : usedUp ? "Used up" : "Live";
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono font-medium tracking-wide">{c.code}</td>
                    <td className="px-4 py-3">{describeCoupon(c)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{c.usedCount}{c.usageLimit !== null ? ` / ${c.usageLimit}` : ""}</td>
                    <td className="whitespace-nowrap px-4 py-3">{c.expiresAt ? formatDate(c.expiresAt) : "No end date"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${status === "Live" ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-700"}`}>{status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-4">
                        <form action={setCouponActive}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={String(!c.isActive)} />
                          <button className="text-sm text-brand underline underline-offset-4">{c.isActive ? "Turn off" : "Turn on"}</button>
                        </form>
                        <form action={deleteCoupon}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmSubmit label="Delete" confirmLabel="Delete" />
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-taupe">A use is counted when an order is placed, and given back if that order is cancelled or expires unpaid.</p>
    </div>
  );
}
