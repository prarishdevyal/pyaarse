"use client";

import { useActionState } from "react";
import { completeAdminInvite } from "../actions";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin-bootstrap";
import { FormField, invalidProps } from "@/components/form-field";

export function SetPasswordForm({ tokenHash, type }: { tokenHash: string; type: "invite" | "recovery" }) {
  const [state, action, pending] = useActionState(completeAdminInvite, undefined);
  const err = (k: string) => state?.fieldErrors?.[k];
  return (
    <div className="flex min-h-screen items-center justify-center bg-blush px-4">
      <form action={action} className="card w-full max-w-sm space-y-4 bg-ivory p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/pyaarse-mark.svg" alt="" className="mx-auto h-16 w-auto" />
        <h1 className="text-center font-serif text-3xl italic text-brand">Welcome to Pyaarse Admin</h1>
        <p className="text-center text-sm text-taupe">Choose a password for your admin account.</p>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <FormField id="password" label="New password" error={err("password")} hint={`At least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`}>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_ADMIN_PASSWORD_LENGTH} required className="input" {...invalidProps("password", err("password"))} />
        </FormField>
        <FormField id="confirm" label="Repeat password" error={err("confirm")}>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" {...invalidProps("confirm", err("confirm"))} />
        </FormField>
        {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending || !tokenHash}>{pending ? "Saving…" : "Set password and continue"}</button>
      </form>
    </div>
  );
}
