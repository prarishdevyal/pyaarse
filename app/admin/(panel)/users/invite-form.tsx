"use client";

import { useActionState } from "react";
import { inviteAdminAction } from "../../actions";
import { inviteAdminSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";

export function InviteAdminForm() {
  const [state, action, pending] = useActionState(inviteAdminAction, undefined);
  const v = useValidation(inviteAdminSchema.shape, state?.fieldErrors);
  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="mt-4 flex flex-wrap items-start gap-3">
      <div className="min-w-64 flex-1">
        <FormField id="invite-email" label="Email" error={v.error("email")}>
          <input id="invite-email" name="email" type="email" autoComplete="off" placeholder="name@example.com" className="input" {...v.bind} {...invalidProps("email", v.error("email"))} />
        </FormField>
      </div>
      <button className="btn-primary mt-7 px-8" disabled={pending}>{pending ? "Sending…" : "Send invite"}</button>
      {state?.success && <p className="w-full text-sm text-emerald-800" role="status">{state.success}</p>}
      {state?.error && <p className="w-full text-sm text-brand" role="alert">{state.error}</p>}
    </form>
  );
}
