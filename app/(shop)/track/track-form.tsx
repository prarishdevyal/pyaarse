"use client";

import Link from "next/link";
import { useActionState } from "react";
import { trackOrder } from "@/app/actions";
import { trackOrderSchema } from "@/lib/validation";
import { formatINR } from "@/lib/format";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";

export function TrackForm({ orderNumber }: { orderNumber: string }) {
  const [state, action, pending] = useActionState(trackOrder, undefined);
  const v = useValidation(trackOrderSchema.shape, state?.fieldErrors);
  const o = state?.order;

  return (
    <div className="mt-8 space-y-6">
      <form action={action} onSubmit={v.onSubmit} noValidate className="card grid gap-4 bg-white p-6 sm:grid-cols-[1fr_1.4fr_auto] sm:items-start">
        <FormField id="orderNumber" label="Order number" error={v.error("orderNumber")}>
          <input id="orderNumber" name="orderNumber" defaultValue={o?.orderNumber ?? orderNumber} placeholder="PY1042" autoCapitalize="characters" className="input uppercase" {...v.bind} {...invalidProps("orderNumber", v.error("orderNumber"))} />
        </FormField>
        <FormField id="contact" label="Email or WhatsApp number" error={v.error("contact")}>
          <input id="contact" name="contact" autoComplete="email" placeholder="Used at checkout" className="input" {...v.bind} {...invalidProps("contact", v.error("contact"))} />
        </FormField>
        <button className="btn-primary sm:mt-7" disabled={pending}>{pending ? "Finding…" : "Track"}</button>
        {state?.error && <p className="text-sm text-brand sm:col-span-3" role="alert">{state.error}</p>}
      </form>

      {o && (
        <section className="anim-rise card bg-white p-6" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-3xl text-brand">Order {o.orderNumber}</h2>
            <p className="text-sm text-taupe">Placed {o.placedAt}</p>
          </div>
          <p className="mt-1">Hi {o.firstName}, here&apos;s where your order is.</p>

          {o.status === "cancelled" ? (
            <p className="mt-6 rounded-xl bg-stone-100 px-4 py-3 text-sm">This order was cancelled. <Link href="/contact" className="text-brand underline">Contact us</Link> if that&apos;s unexpected.</p>
          ) : (
            <ol className="mt-6 grid grid-cols-4 gap-2">
              {o.steps.map((s) => (
                <li key={s.key} className="text-center text-xs sm:text-sm">
                  <span className={`mx-auto mb-2 block h-1.5 rounded-full ${s.done ? "bg-brand" : "bg-sand/60"}`} />
                  <span className={s.current ? "font-medium text-brand" : s.done ? "" : "text-taupe"}>{s.label}</span>
                </li>
              ))}
            </ol>
          )}

          {o.status === "pending_payment" &&
            (o.payPath ? (
              <div className="mt-5">
                <p className="text-sm text-charcoal/80">This order is waiting for payment. It&apos;s prepared once payment is received.</p>
                <Link href={o.payPath} className="btn-primary mt-3">Pay now</Link>
              </div>
            ) : (
              <p className="mt-5 text-sm text-charcoal/80">We&apos;ll send a UPI payment QR code on WhatsApp. Your order is prepared once payment is received.</p>
            ))}

          {o.trackingNumber && o.delhiveryUrl && (
            <div className="mt-6 rounded-xl bg-blush p-4">
              <p className="text-sm">Shipped with <strong>Delhivery</strong>{o.shippedAt ? ` on ${o.shippedAt}` : ""}</p>
              <p className="mt-1 text-sm">Tracking number (AWB): <strong className="select-all">{o.trackingNumber}</strong></p>
              <a href={o.delhiveryUrl} target="_blank" rel="noreferrer" className="btn-primary mt-3">Track on Delhivery</a>
            </div>
          )}

          <ul className="mt-6 divide-y divide-sand/50 border-t border-sand/50 text-sm">
            {o.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-4 py-2"><span>{i.name}</span><span className="text-taupe">× {i.quantity}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-right font-medium">Total {formatINR(o.total)}</p>
        </section>
      )}
    </div>
  );
}
