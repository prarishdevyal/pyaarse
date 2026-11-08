"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatINR, STATUS_LABELS } from "@/lib/format";
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

      <div className="card overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-sand/60 text-left text-taupe">
            <tr>
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
              <tr key={o.id} className={`border-b border-sand/30 last:border-0 align-top ${selected.has(o.id) ? "bg-blush/50" : "hover:bg-blush/30"}`}>
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
