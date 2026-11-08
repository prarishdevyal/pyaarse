"use client";

import { useActionState } from "react";
import { saveSettings } from "../../actions";
import { settingsSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";

type Initial = { shippingFee: number; freeShippingThreshold: number; contactEmail: string; contactWhatsapp: string; contactInstagram: string };

export function SettingsForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  // After a save, show what was stored: React resets the form to these defaults once the action finishes.
  const values = state?.saved ?? initial;
  const v = useValidation(settingsSchema.shape);
  return (
    <form key={JSON.stringify(values)} action={action} onSubmit={v.onSubmit} noValidate className="card space-y-6 bg-white p-5">
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Shipping</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="shippingFee" label="Shipping fee (₹)" error={v.error("shippingFee")}>
            <input id="shippingFee" name="shippingFee" inputMode="numeric" className="input" defaultValue={values.shippingFee} {...v.bind} {...invalidProps("shippingFee", v.error("shippingFee"))} />
          </FormField>
          <FormField id="freeShippingThreshold" label="Free shipping from (₹)" error={v.error("freeShippingThreshold")}>
            <input id="freeShippingThreshold" name="freeShippingThreshold" inputMode="numeric" className="input" defaultValue={values.freeShippingThreshold} {...v.bind} {...invalidProps("freeShippingThreshold", v.error("freeShippingThreshold"))} />
          </FormField>
        </div>
        <p className="text-xs text-taupe">Orders at or above the free-shipping amount pay no shipping. Set the fee to 0 to always ship free.</p>
      </section>

      <section className="space-y-4 border-t border-sand/60 pt-5">
        <h2 className="font-serif text-2xl">Contact details</h2>
        <p className="text-xs text-taupe">Shown in the shop footer, the home page gifting button and on invoices. Leave a box empty to use the default.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="contactEmail" label="Email" error={v.error("contactEmail")}>
            <input id="contactEmail" name="contactEmail" type="email" className="input" placeholder="query@pyaarse.net" defaultValue={values.contactEmail} {...v.bind} {...invalidProps("contactEmail", v.error("contactEmail"))} />
          </FormField>
          <FormField id="contactWhatsapp" label="WhatsApp number" error={v.error("contactWhatsapp")}>
            <input id="contactWhatsapp" name="contactWhatsapp" type="tel" inputMode="tel" className="input" placeholder="10-digit mobile" defaultValue={values.contactWhatsapp} {...v.bind} {...invalidProps("contactWhatsapp", v.error("contactWhatsapp"))} />
          </FormField>
          <FormField id="contactInstagram" label="Instagram" hint="Username or link, e.g. pyaarse_net" error={v.error("contactInstagram")}>
            <input id="contactInstagram" name="contactInstagram" className="input" placeholder="pyaarse_net" defaultValue={values.contactInstagram} {...v.bind} {...invalidProps("contactInstagram", v.error("contactInstagram"))} />
          </FormField>
        </div>
      </section>

      {state?.error && <p className="text-sm text-brand">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
