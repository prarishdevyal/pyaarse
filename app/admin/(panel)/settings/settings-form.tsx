"use client";

import { useActionState } from "react";
import { saveSettings } from "../../actions";
import { settingsSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";

type Initial = { shippingFee: number; freeShippingThreshold: number; sendOrderEmails: boolean };

export function SettingsForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const v = useValidation(settingsSchema.shape);
  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="card space-y-6 bg-white p-5">
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Shipping</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="shippingFee" label="Shipping fee (₹)" error={v.error("shippingFee")}>
            <input id="shippingFee" name="shippingFee" inputMode="numeric" className="input" defaultValue={initial.shippingFee} {...v.bind} {...invalidProps("shippingFee", v.error("shippingFee"))} />
          </FormField>
          <FormField id="freeShippingThreshold" label="Free shipping from (₹)" error={v.error("freeShippingThreshold")}>
            <input id="freeShippingThreshold" name="freeShippingThreshold" inputMode="numeric" className="input" defaultValue={initial.freeShippingThreshold} {...v.bind} {...invalidProps("freeShippingThreshold", v.error("freeShippingThreshold"))} />
          </FormField>
        </div>
        <p className="text-xs text-taupe">Orders at or above the free-shipping amount pay no shipping. Set the fee to 0 to always ship free.</p>
      </section>

      <section className="space-y-2 border-t border-sand/60 pt-5">
        <h2 className="font-serif text-2xl">Emails</h2>
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block font-medium">Send order confirmation emails</span>
            <span className="text-xs text-taupe">When off, customers get no email; you still get the Telegram alert.</span>
          </span>
          <input type="checkbox" name="sendOrderEmails" defaultChecked={initial.sendOrderEmails} className="peer sr-only" />
          <span
            aria-hidden
            className="relative h-6 w-11 shrink-0 rounded-full bg-sand transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
          />
        </label>
      </section>

      {state?.error && <p className="text-sm text-brand">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
