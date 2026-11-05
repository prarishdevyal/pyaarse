"use client";

import { useActionState } from "react";
import Link from "next/link";
import { adminLogin } from "../actions";
import { loginSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  const v = useValidation(loginSchema.shape);
  return (
    <div className="flex min-h-screen items-center justify-center bg-blush px-4">
      <form action={action} onSubmit={v.onSubmit} noValidate className="card w-full max-w-sm space-y-4 bg-ivory p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/pyaarse-mark.svg" alt="" className="mx-auto h-16 w-auto" />
        <h1 className="text-center font-serif text-3xl italic text-brand">Pyaarse Admin</h1>
        <FormField id="email" label="Email" error={v.error("email")}>
          <input id="email" name="email" type="email" autoComplete="email" className="input" {...v.bind} {...invalidProps("email", v.error("email"))} />
        </FormField>
        <FormField id="password" label="Password" error={v.error("password")}>
          <input id="password" name="password" type="password" autoComplete="current-password" className="input" {...v.bind} {...invalidProps("password", v.error("password"))} />
        </FormField>
        {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
        <p className="text-center text-sm"><Link href="/forgot-password" className="text-brand underline">Forgot password?</Link></p>
      </form>
    </div>
  );
}
