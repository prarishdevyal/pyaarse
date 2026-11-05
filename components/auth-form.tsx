"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { loginSchema, registerSchema } from "@/lib/validation";
import { useValidation } from "./use-validation";
import { FormField, invalidProps } from "./form-field";

type Field = { name: string; label: string; type?: string; autoComplete?: string; hint?: string };
const SCHEMAS = { login: loginSchema.shape, register: registerSchema.shape };

export function AuthForm({
  action, fields, submitLabel, next, rules,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  next?: string;
  rules: keyof typeof SCHEMAS;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const v = useValidation(SCHEMAS[rules], state?.fieldErrors);
  return (
    <form action={formAction} onSubmit={v.onSubmit} noValidate className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {fields.map((f) => (
        <FormField key={f.name} id={f.name} label={f.label} hint={f.hint} error={v.error(f.name)}>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            className="input"
            {...v.bind}
            {...invalidProps(f.name, v.error(f.name))}
          />
        </FormField>
      ))}
      {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
      {state?.success && <p className="rounded-xl bg-blush px-4 py-3 text-sm" role="status">{state.success}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Please wait…" : submitLabel}</button>
    </form>
  );
}
