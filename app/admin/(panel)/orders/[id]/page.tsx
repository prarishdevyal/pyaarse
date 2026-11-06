import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/db/schema";
import { formatINR, STATUS_LABELS, toWhatsAppNumber, formatDateTime } from "@/lib/format";
import { canChangeStatus } from "@/lib/order-status";
import { StatusBadge } from "@/components/status-badge";
import { ShareInvoiceButton } from "@/components/share-invoice-button";
import { invoiceNumber } from "@/lib/invoice";
import { invoiceWhatsAppText } from "@/lib/invoice-message";
import { resendInvoice, saveTrackingAction, updateOrderStatus } from "../../../actions";
import { delhiveryTrackingUrl } from "@/lib/tracking";

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invoice?: string; reason?: string; shipping?: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (!order) notFound();
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
  const { invoice, reason, shipping } = await searchParams;
  const paid = order.status === "paid" || order.status === "shipped" || order.status === "delivered";
  const invoiceFile = `${invoiceNumber(order.orderNumber)}.pdf`;
  const options = ORDER_STATUSES.filter((s) => canChangeStatus(order.status, s));
  const NEXT: Partial<Record<string, string>> = { pending_payment: "paid", paid: "shipped", shipped: "delivered" };
  const suggested = NEXT[order.status] ?? options[0];
  const waMessage = invoiceWhatsAppText({ customerName: order.customerName, orderNumber: order.orderNumber, total: order.total, paid });

  return (
    <div className="space-y-6">
      <Link href="/orders" className="text-sm text-taupe hover:text-brand">← All orders</Link>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-4xl text-brand">Order {order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>
      {shipping === "emailed" && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">Tracking saved and the customer was emailed the Delhivery link.</p>
      )}
      {shipping === "saved" && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">Tracking number saved.</p>
      )}
      {shipping === "failed" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">{reason ?? "Couldn't save the tracking number."}</p>
      )}
      {invoice === "sent" && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">Invoice emailed to {order.email}.</p>
      )}
      {invoice === "failed" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          The invoice email couldn&apos;t be sent{reason ? `: ${reason}` : "."} The order status was still saved. Fix the email settings, then use Resend invoice.
        </p>
      )}
      <p className="text-sm text-taupe">Placed {formatDateTime(order.createdAt, "full")}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card bg-white p-5">
            <h2 className="mb-3 font-serif text-2xl">Items</h2>
            <ul className="divide-y divide-sand/40 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between py-2">
                  <span>{i.productName} <span className="text-taupe">({i.variantName}) × {i.quantity} @ {formatINR(i.unitPrice)}</span></span>
                  <span>{formatINR(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-sand/60 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[#1f8f4e]"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>−{formatINR(order.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shipping ? formatINR(order.shipping) : "Free"}</dd></div>
              <div className="flex justify-between text-base font-medium"><dt>Total</dt><dd className="text-brand">{formatINR(order.total)}</dd></div>
            </dl>
          </section>

          <section className="card bg-white p-5 text-sm">
            <h2 className="mb-3 font-serif text-2xl">Customer</h2>
            <p className="font-medium">{order.customerName}</p>
            <p>{order.phone} · {order.email}</p>
            <p className="mt-3 text-taupe">Ship to</p>
            <p>{order.addressLine}<br />{order.city}, {order.state} – {order.pincode}</p>
            {order.notes && (<><p className="mt-3 text-taupe">Notes</p><p className="whitespace-pre-line">{order.notes}</p></>)}
            {!order.userId && <p className="mt-3 text-xs text-taupe">Guest checkout</p>}
          </section>
        </div>

        <aside className="space-y-4">
          {order.status !== "cancelled" && (
            <div className="card space-y-3 bg-white p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-xl">Invoice</h2>
                <span className="text-sm text-taupe">{invoiceNumber(order.orderNumber)}</span>
              </div>
              <p className="text-sm">
                {paid ? "Paid" : "Amount to pay"}: <strong className="text-brand">{formatINR(order.total)}</strong>
              </p>
              <ShareInvoiceButton
                pdfUrl={`/orders/${order.id}/invoice`}
                filename={invoiceFile}
                waNumber={toWhatsAppNumber(order.phone)}
                message={waMessage}
              />
              <a href={`/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="btn-secondary w-full">View invoice (PDF)</a>
              {paid && (
                <form action={resendInvoice}>
                  <input type="hidden" name="id" value={order.id} />
                  <button className="w-full text-sm text-brand underline underline-offset-4">Resend invoice email</button>
                </form>
              )}
            </div>
          )}
          <a
            href={`https://wa.me/${toWhatsAppNumber(order.phone)}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-sm text-[#1f8f4e] underline underline-offset-4"
          >
            Open WhatsApp chat without the invoice
          </a>
          {order.status !== "cancelled" && (
            <div className="card space-y-3 bg-white p-5">
              <h2 className="font-serif text-xl">Shipping (Delhivery)</h2>
              {order.trackingNumber && (
                <div className="rounded-lg bg-blush p-3 text-sm">
                  <p>AWB <strong className="select-all">{order.trackingNumber}</strong></p>
                  {order.shippedAt && <p className="text-xs text-taupe">Shipped {formatDateTime(order.shippedAt)}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <a href={delhiveryTrackingUrl(order.trackingNumber)} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-4">Track on Delhivery</a>
                    <a
                      href={`https://wa.me/${toWhatsAppNumber(order.phone)}?text=${encodeURIComponent(`Hi ${order.customerName.split(" ")[0]}, your Pyaarse order ${order.orderNumber} has shipped with Delhivery! Track it here: ${delhiveryTrackingUrl(order.trackingNumber)}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1f8f4e] underline underline-offset-4"
                    >
                      Send tracking on WhatsApp
                    </a>
                  </div>
                </div>
              )}
              <form action={saveTrackingAction} className="space-y-3">
                <input type="hidden" name="id" value={order.id} />
                <label className="label" htmlFor="awb">Delhivery AWB (waybill) number</label>
                <input id="awb" name="awb" required inputMode="text" autoComplete="off" defaultValue={order.trackingNumber ?? ""} placeholder="e.g. 1234567890123" className="input" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="notify" defaultChecked={!order.trackingNumber} className="h-4 w-4 accent-brand" /> Email the customer the tracking link
                </label>
                <button className="btn-primary w-full">{order.trackingNumber ? "Update tracking" : "Save & mark shipped"}</button>
                {!order.trackingNumber && <p className="text-xs text-taupe">Saving marks the order Shipped.</p>}
              </form>
            </div>
          )}
          <div className="card bg-white p-5">
            <h2 className="mb-3 font-serif text-xl">Update status</h2>
            {options.length === 0 ? (
              <p className="text-sm text-taupe">This order is cancelled. Its stock has been returned.</p>
            ) : (
              <form action={updateOrderStatus} className="space-y-3">
                <input type="hidden" name="id" value={order.id} />
                <select name="status" className="input" defaultValue={suggested}>
                  {options.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                <button className="btn-primary w-full">Save status</button>
                <p className="text-xs text-taupe">Marking an order Paid emails the customer their invoice. Cancelling returns the items to stock and can&apos;t be undone.</p>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
