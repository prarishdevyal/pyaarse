"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SavedSettings } from "../../actions";
import { settingsSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";
import { formatINR } from "@/lib/format";
import { codFee, deliveryFee } from "@/lib/shipping";

export function SettingsForm({ initial }: { initial: SavedSettings }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  // After a save, show what was stored: React resets the form to these defaults once the action finishes.
  const values = state?.saved ?? initial;
  const v = useValidation(settingsSchema.shape);
  const num = (name: keyof SavedSettings, label: string, hint?: string, mode: "numeric" | "decimal" = "numeric") => (
    <FormField id={name} label={label} hint={hint} error={v.error(name)}>
      <input id={name} name={name} inputMode={mode} className="input" defaultValue={String(values[name])} {...v.bind} {...invalidProps(name, v.error(name))} />
    </FormField>
  );
  return (
    <form key={JSON.stringify(values)} action={action} onSubmit={v.onSubmit} noValidate className="card space-y-6 bg-white p-5">
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Delivery charges</h2>
        <p className="text-xs text-taupe">
          Worked out from each order&apos;s weight and box size, like Delhivery: the real weight or L × W × H ÷ 5000 kg, whichever is more,
          rounded up to the next 0.5 kg. GST is added and the fee is rounded up to whole rupees.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {num("baseRate", "First 0.5 kg (₹)")}
          {num("slabRate", "Each extra 0.5 kg (₹)")}
          {num("gstPercent", "GST (%)", undefined, "decimal")}
          {num("freeShippingThreshold", "Free delivery from (₹)", "0 = never free")}
        </div>
        <Examples values={values} />
      </section>

      <section className="space-y-4 border-t border-sand/60 pt-5">
        <h2 className="font-serif text-2xl">Cash on Delivery</h2>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="codEnabled" defaultChecked={values.codEnabled} className="h-5 w-5 accent-brand" />
          <span><strong>Offer Cash on Delivery</strong> at checkout</span>
        </label>
        <p className="text-xs text-taupe">
          The COD charge is the flat amount or the percentage of the items, whichever is more, plus GST. It&apos;s added even when delivery is free.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {num("codFlatFee", "COD flat charge (₹)")}
          {num("codPercent", "COD percentage (%)", undefined, "decimal")}
          {num("codMinOrder", "COD from order of (₹)", "0 = no minimum")}
          {num("codMaxOrder", "COD up to order of (₹)", "0 = no maximum")}
        </div>
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

/** What customers would pay with the saved rates, so the numbers are easy to check. */
function Examples({ values }: { values: SavedSettings }) {
  const [items, setItems] = useState(500);
  const rows = [400, 1000, 2200].map((g) => ({ g, fee: deliveryFee(g, items, values) }));
  return (
    <div className="rounded-xl bg-blush/60 p-4 text-sm">
      <p className="font-medium">
        With the saved rates, an order worth{" "}
        <select value={items} onChange={(e) => setItems(Number(e.target.value))} className="rounded border border-sand bg-white px-1 py-0.5">
          {[500, 1000, 2000].map((n) => <option key={n} value={n}>{formatINR(n)}</option>)}
        </select>{" "}
        pays:
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.g} className="flex justify-between gap-3">
            <span>{r.g >= 1000 ? `${r.g / 1000} kg` : `${r.g} g`} parcel</span>
            <span>{r.fee === 0 ? "Free delivery" : formatINR(r.fee)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 border-t border-sand/60 pt-1">
          <span>Cash on Delivery adds</span>
          <span>{values.codEnabled ? formatINR(codFee(items, values)) : "COD is off"}</span>
        </li>
      </ul>
      <p className="mt-2 text-xs text-taupe">Save to update these examples.</p>
    </div>
  );
}
