"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/actions";
import { resetPasswordSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";

export function ResetPasswordForm({ tokenHash }: { tokenHash: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  const v = useValidation({ password: resetPasswordSchema.shape.password }, state?.fieldErrors);
  if (!tokenHash) {
    return (
      <p className="text-sm">
        This link is incomplete. <Link href="/forgot-password" className="text-brand underline">Ask for a new one</Link>.
      </p>
    );
  }
  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <FormField id="password" label="New password" hint="At least 8 characters." error={v.error("password")}>
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" {...v.bind} {...invalidProps("password", v.error("password"))} />
      </FormField>
      <FormField id="confirm" label="Repeat new password" error={state?.fieldErrors?.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" {...invalidProps("confirm", state?.fieldErrors?.confirm)} />
      </FormField>
      {state?.error && (
        <p className="text-sm text-brand" role="alert">
          {state.error} <Link href="/forgot-password" className="underline">Get a new link</Link>
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
