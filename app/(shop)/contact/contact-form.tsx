"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/app/actions";
import { contactSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";
import { phoneInputProps } from "@/lib/phone-input";

export function ContactForm({ defaults }: { defaults: { name: string; email: string } }) {
  const [state, action, pending] = useActionState(sendContactMessage, undefined);
  const v = useValidation(contactSchema.shape, state?.fieldErrors);

  if (state?.success) {
    return (
      <div className="anim-rise card bg-white p-8 text-center" role="status">
        <p className="font-serif text-3xl text-brand">Message sent</p>
        <p className="mt-2 text-charcoal/80">{state.success}</p>
      </div>
    );
  }

  const ctl = (name: string) => ({ id: name, name, className: "input", ...v.bind, ...invalidProps(name, v.error(name)) });

  return (
    <form action={action} onSubmit={v.onSubmit} className="card space-y-5 bg-white p-6 sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="name" label="Your name" error={v.error("name")}>
          <input {...ctl("name")} autoComplete="name" defaultValue={defaults.name} />
        </FormField>
        <FormField id="email" label="Email" error={v.error("email")}>
          <input {...ctl("email")} type="email" autoComplete="email" defaultValue={defaults.email} />
        </FormField>
      </div>
      <FormField id="phone" label="WhatsApp number" optional error={v.error("phone")}>
        <input {...ctl("phone")} {...phoneInputProps} autoComplete="tel" placeholder="10-digit mobile" />
      </FormField>
      <FormField id="message" label="Message" error={v.error("message")} hint="At least 10 characters.">
        <textarea {...ctl("message")} rows={6} maxLength={2000} placeholder="Tell us about your order, a gift you're planning, or a bulk enquiry." />
      </FormField>
      {/* Trap field for bots: hidden from people and screen readers */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
      <button className="btn-primary w-full sm:w-auto sm:px-10" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
