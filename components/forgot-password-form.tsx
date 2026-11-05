"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { forgotPasswordSchema } from "@/lib/validation";
import { useValidation } from "./use-validation";
import { FormField, invalidProps } from "./form-field";

/** Email box that asks for a reset link. Used on the shop and the admin login. */
export function ForgotPasswordForm({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const v = useValidation(forgotPasswordSchema.shape, state?.fieldErrors);
  if (state?.success) return <p className="rounded-xl bg-blush px-4 py-3 text-sm" role="status">{state.success}</p>;
  return (
    <form action={formAction} onSubmit={v.onSubmit} noValidate className="space-y-4">
      <FormField id="email" label="Email" error={v.error("email")}>
        <input id="email" name="email" type="email" autoComplete="email" className="input" {...v.bind} {...invalidProps("email", v.error("email"))} />
      </FormField>
      {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send me a link"}</button>
    </form>
  );
}
