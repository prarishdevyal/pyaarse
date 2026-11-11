"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatINR, STATUS_LABELS, toWhatsAppNumber } from "@/lib/format";
import { delhiveryTrackingUrl } from "@/lib/tracking";
import type { OrderStatus } from "@/lib/db/schema";
import { ADMIN_NOTE_MAX } from "@/lib/order-note";
import { isNewOrder } from "@/lib/live";
import { setOrderNote, setOrdersStatus, type BulkStatusResult } from "../../actions";

// Status order as defined for labels; avoids pulling the database schema into the browser bundle.
const ORDER_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

export type ManagedOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  phone: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  adminNote: string;
  /** Shown when the row is opened. */
  details: {
    email: string;
    address: string;
    customerNote: string;
    items: { name: string; quantity: number; unitPrice: number }[];
    subtotal: number;
    discount: number;
    couponCode: string | null;
    shipping: number;
    trackingNumber: string | null;
    payment: { status: string; method: string | null; test: boolean } | null;
  };
};

/** What happens when an order moves to this status, said before it happens. */
const EFFECT: Partial<Record<OrderStatus, string>> = {
  paid: "Orders awaiting payment will be marked paid and the customer is emailed their invoice.",
  cancelled: "Cancelled orders go back on sale and can't be changed again.",
};

function summary(r: BulkStatusResult, to: OrderStatus): string {
  const parts = [`${r.changed} order${r.changed === 1 ? "" : "s"} changed to ${STATUS_LABELS[to]}.`];
  if (r.skipped.length) parts.push(`Not changed (already ${STATUS_LABELS[to]}, or cancelled): ${r.skipped.join(", ")}.`);
  if (r.invoiceFailed.length) parts.push(`Invoice email failed for ${r.invoiceFailed.join(", ")}; use Resend invoice on those orders.`);
  return parts.join(" ");
}

/** The Orders list: tick orders to change many at once, change one from its row, and edit each order's note. */
export function OrdersManager({ orders }: { orders: ManagedOrder[] }) {
  const router = useRouter();
  const [picked, setSelected] = useState<Set<number>>(new Set());
  const [bulkTo, setBulkTo] = useState<OrderStatus | "">("");
  const [confirming, setConfirming] = useState<{ ids: number[]; to: OrderStatus } | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<Set<number>>(new Set());
  const allOpen = orders.length > 0 && orders.every((o) => open.has(o.id));
  const toggleOpen = (id: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const changeable = useMemo(() => orders.filter((o) => o.status !== "cancelled").map((o) => o.id), [orders]);
  // Only orders still on screen (and still changeable) count, e.g. after a filter or a cancel.
  const selected = useMemo(() => new Set(changeable.filter((id) => picked.has(id))), [changeable, picked]);
  const allOn = changeable.length > 0 && changeable.every((id) => selected.has(id));

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply(ids: number[], to: OrderStatus) {
    setConfirming(null);
    start(async () => {
      const r = await setOrdersStatus(ids, to);
      if ("error" in r) setMessage({ text: r.error, error: true });
      else {
        setMessage({ text: summary(r, to), error: r.invoiceFailed.length > 0 });
        setSelected(new Set());
        setBulkTo("");
      }
      router.refresh();
    });
  }

  if (orders.length === 0) return <p className="py-8 text-center text-taupe">No orders yet.</p>;

  const count = selected.size;
  return (
    <div className="space-y-3" aria-busy={pending}>
      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.error ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`} role="status">
          {message.text}
        </p>
      )}

      {count > 0 && (
        <div className="card sticky top-2 z-10 flex flex-wrap items-center gap-3 border-2 border-brand bg-white p-3 text-sm shadow-soft">
          <strong>{count} selected</strong>
          {confirming ? (
            <>
              <span>
                Change {confirming.ids.length} order{confirming.ids.length === 1 ? "" : "s"} to <strong>{STATUS_LABELS[confirming.to]}</strong>?{" "}
                {EFFECT[confirming.to]}
              </span>
              <button type="button" className="btn-primary px-4 py-1.5" disabled={pending} onClick={() => apply(confirming.ids, confirming.to)}>
                Yes, change
              </button>
              <button type="button" className="underline underline-offset-4" onClick={() => setConfirming(null)}>Back</button>
            </>
          ) : (
            <>
              <label htmlFor="bulk-status" className="text-taupe">Change status to</label>
              <select id="bulk-status" value={bulkTo} onChange={(e) => setBulkTo(e.target.value as OrderStatus)} className="input w-auto py-1.5">
                <option value="" disabled>Choose…</option>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <button type="button" className="btn-primary px-4 py-1.5" disabled={!bulkTo || pending} onClick={() => bulkTo && setConfirming({ ids: [...selected], to: bulkTo })}>
                {pending ? "Saving…" : "Apply"}
              </button>
              <button type="button" className="underline underline-offset-4" onClick={() => setSelected(new Set())}>Clear selection</button>
            </>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen(allOpen ? new Set() : new Set(orders.map((o) => o.id)))} className="text-sm text-brand underline underline-offset-4">
          {allOpen ? "Collapse all details" : "Expand all details"}
        </button>
      </div>

      <div className="card overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-sand/60 text-left text-taupe">
            <tr>
              <th className="w-8 px-2 py-3"><span className="sr-only">Details</span></th>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all orders that can change"
                  checked={allOn}
                  onChange={() => setSelected(allOn ? new Set() : new Set(changeable))}
                  className="h-4 w-4 accent-brand"
                />
              </th>
              <th className="px-3 py-3 font-medium">Order</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="min-w-56 px-3 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <Fragment key={o.id}>
              <tr className={`align-top ${open.has(o.id) ? "" : "border-b border-sand/30"} ${selected.has(o.id) ? "bg-blush/50" : "hover:bg-blush/30"}`}>
                <td className="px-2 py-3">
                  <button
                    type="button"
                    onClick={() => toggleOpen(o.id)}
                    aria-expanded={open.has(o.id)}
                    aria-controls={`details-${o.id}`}
                    aria-label={`${open.has(o.id) ? "Hide" : "Show"} details of ${o.orderNumber}`}
                    className="rounded p-1 text-taupe hover:bg-blush hover:text-brand"
                  >
                    <span aria-hidden className={`inline-block transition-transform motion-reduce:transition-none ${open.has(o.id) ? "rotate-90" : ""}`}>▸</span>
                  </button>
                </td>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${o.orderNumber}`}
                    checked={selected.has(o.id)}
                    disabled={o.status === "cancelled"}
                    onChange={() => toggle(o.id)}
                    className="h-4 w-4 accent-brand disabled:opacity-30"
                  />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/orders/${o.id}`} className="font-medium text-brand hover:underline">{o.orderNumber}</Link>
                  {isNewOrder(o.createdAt) && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-medium uppercase text-white">New</span>}
                </td>
                <td className="px-3 py-3">{o.customerName}<div className="text-xs text-taupe">{o.phone}</div></td>
                <td className="whitespace-nowrap px-3 py-3">{formatDateTime(o.createdAt)}</td>
                <td className="px-3 py-3">{formatINR(o.total)}</td>
                <td className="px-3 py-3"><RowStatus order={o} busy={pending} onChange={(to) => askRow(o, to)} /></td>
                <td className="px-3 py-3"><NoteCell order={o} /></td>
              </tr>
              {open.has(o.id) && (
                <tr id={`details-${o.id}`} className="border-b border-sand/30 bg-[#fbf8f3]">
                  <td colSpan={8} className="px-4 pb-4 pt-1"><OrderDetails order={o} /></td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // A row change that has side effects (paid → invoice email, cancelled → final) asks first, in the bulk bar's place.
  function askRow(o: ManagedOrder, to: OrderStatus) {
    if (EFFECT[to]) {
      setSelected(new Set([o.id]));
      setConfirming({ ids: [o.id], to });
    } else apply([o.id], to);
  }
}

function RowStatus({ order, busy, onChange }: { order: ManagedOrder; busy: boolean; onChange: (to: OrderStatus) => void }) {
  if (order.status === "cancelled") return <StatusBadge status="cancelled" />;
  return (
    <select
      aria-label={`Status of ${order.orderNumber}`}
      value={order.status}
      disabled={busy}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      className="input w-auto py-1 text-sm"
    >
      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
    </select>
  );
}

function NoteCell({ order }: { order: ManagedOrder }) {
  const router = useRouter();
  const [note, setNote] = useState(order.adminNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(order.adminNote);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function save(value: string) {
    setError(undefined);
    start(async () => {
      const r = await setOrderNote(order.id, value);
      if ("error" in r) return setError(r.error);
      setNote(r.note);
      setDraft(r.note);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="w-full text-left" aria-label={note ? `Edit note on ${order.orderNumber}` : `Add a note to ${order.orderNumber}`}>
        {note ? <span className="line-clamp-2 whitespace-pre-line">{note}</span> : <span className="text-taupe underline underline-offset-4">Add note</span>}
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <textarea
        autoFocus
        rows={2}
        maxLength={ADMIN_NOTE_MAX}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(draft);
          if (e.key === "Escape") { setDraft(note); setEditing(false); }
        }}
        aria-label={`Note on ${order.orderNumber}`}
        placeholder="Only admins see this"
        className="input text-sm"
      />
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className="btn-primary px-3 py-1 text-xs" disabled={pending} onClick={() => save(draft)}>{pending ? "Saving…" : "Save"}</button>
        {note && <button type="button" className="text-brand underline underline-offset-4" disabled={pending} onClick={() => save("")}>Remove</button>}
        <button type="button" className="text-taupe underline underline-offset-4" onClick={() => { setDraft(note); setEditing(false); }}>Cancel</button>
      </div>
      {error && <p className="text-xs text-brand" role="alert">{error}</p>}
    </div>
  );
}

/** The quick look under a row: what was ordered, where it goes, how it was paid and where it is. */
function OrderDetails({ order }: { order: ManagedOrder }) {
  const d = order.details;
  const payment = d.payment
    ? d.payment.status === "created"
      ? "Online payment started, not completed"
      : `Paid online${d.payment.method ? ` by ${d.payment.method.replace(/_/g, " ")}` : ""}${d.payment.test ? " (test mode, no real money)" : ""}`
    : order.status === "pending_payment" || order.status === "cancelled"
      ? "Not paid"
      : "Marked paid by hand";
  return (
    <div className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <p className="mb-1 font-medium">Items</p>
        <ul className="space-y-1">
          {d.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-3">
              <span>{i.name} × {i.quantity}</span>
              <span className="tabular-nums">{formatINR(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-0.5 border-t border-sand/60 pt-2 text-taupe">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(d.subtotal)}</dd></div>
          {d.discount > 0 && <div className="flex justify-between text-[#1f8f4e]"><dt>Discount{d.couponCode ? ` (${d.couponCode})` : ""}</dt><dd>−{formatINR(d.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{d.shipping ? formatINR(d.shipping) : "Free"}</dd></div>
          <div className="flex justify-between font-medium text-charcoal"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
        </dl>
      </div>
      <div>
        <p className="mb-1 font-medium">Ship to</p>
        <p>{order.customerName}</p>
        <p className="text-charcoal/80">{d.address}</p>
        <p className="mt-2">
          <a href={`https://wa.me/${toWhatsAppNumber(order.phone)}`} target="_blank" rel="noreferrer" className="text-[#1f8f4e] underline underline-offset-4">{order.phone}</a>
          <span className="text-taupe"> · </span>
          <a href={`mailto:${d.email}`} className="underline underline-offset-4">{d.email}</a>
        </p>
        {d.customerNote && <p className="mt-2"><span className="text-taupe">Customer note:</span> {d.customerNote}</p>}
      </div>
      <div>
        <p className="mb-1 font-medium">Payment</p>
        <p className={d.payment?.test ? "text-amber-800" : ""}>{payment}</p>
        <p className="mb-1 mt-3 font-medium">Shipping</p>
        {d.trackingNumber ? (
          <p>
            AWB <span className="select-all">{d.trackingNumber}</span>{" "}
            <a href={delhiveryTrackingUrl(d.trackingNumber)} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-4">Track</a>
          </p>
        ) : (
          <p className="text-taupe">Not shipped yet</p>
        )}
        <Link href={`/orders/${order.id}`} className="mt-3 inline-block text-brand underline underline-offset-4">Open full order</Link>
      </div>
    </div>
  );
}
