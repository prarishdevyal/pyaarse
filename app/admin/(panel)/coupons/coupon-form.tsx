"use client";

import { useActionState, useState } from "react";
import { createCoupon } from "../../actions";
import { FormField, invalidProps } from "@/components/form-field";

export function CouponForm() {
  const [state, action, pending] = useActionState(createCoupon, undefined);
  const [kind, setKind] = useState<"percent" | "flat">("percent");
  const err = (k: string) => state?.fieldErrors?.[k];
  const input = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} className="input" {...invalidProps(name, err(name))} {...props} />
  );

  return (
    <form action={action} key={state?.success} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FormField id="code" label="Code" error={err("code")} hint="Letters and numbers, e.g. DIWALI10.">
        {input("code", { required: true, maxLength: 20, autoComplete: "off", className: "input uppercase", placeholder: "DIWALI10" })}
      </FormField>
      <FormField id="kind" label="Type" error={err("kind")}>
        <select id="kind" name="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "flat")}>
          <option value="percent">Percent off</option>
          <option value="flat">Rupees off</option>
        </select>
      </FormField>
      <FormField id="value" label={kind === "percent" ? "Percent off (%)" : "Amount off (₹)"} error={err("value")}>
        {input("value", { required: true, inputMode: "numeric", placeholder: kind === "percent" ? "10" : "100" })}
      </FormField>
      <FormField id="minSubtotal" label="Minimum order (₹)" optional error={err("minSubtotal")}>
        {input("minSubtotal", { inputMode: "numeric", placeholder: "0" })}
      </FormField>
      {kind === "percent" && (
        <FormField id="maxDiscount" label="Max discount (₹)" optional error={err("maxDiscount")} hint="Caps the amount off on big orders.">
          {input("maxDiscount", { inputMode: "numeric", placeholder: "No cap" })}
        </FormField>
      )}
      <FormField id="usageLimit" label="Total uses allowed" optional error={err("usageLimit")}>
        {input("usageLimit", { inputMode: "numeric", placeholder: "Unlimited" })}
      </FormField>
      <FormField id="expiresOn" label="Last day" optional error={err("expiresOn")} hint="Works until midnight, India time.">
        {input("expiresOn", { type: "date" })}
      </FormField>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
        <button className="btn-primary px-8" disabled={pending}>{pending ? "Creating…" : "Create coupon"}</button>
        {state?.success && <p className="text-sm text-emerald-800" role="status">{state.success}</p>}
        {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
