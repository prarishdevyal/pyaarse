"use client";

import { useActionState, useState } from "react";
import { saveContent } from "../../actions";
import type { ContentField } from "@/lib/content-defaults";

type Field = ContentField & { value: string };

export function ContentForm({ title, fields }: { title: string; fields: Field[] }) {
  const [state, action, pending] = useActionState(saveContent, undefined);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));

  return (
    <form action={action} className="card space-y-5 bg-white p-5">
      <h2 className="font-serif text-2xl">{title}</h2>
      {fields.map((f) => {
        const value = values[f.key];
        const isDefault = value === f.default;
        const set = (v: string) => setValues((s) => ({ ...s, [f.key]: v }));
        const common = {
          id: f.key,
          name: f.key,
          value,
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(e.target.value),
          className: "input",
        };
        return (
          <div key={f.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor={f.key} className="text-sm font-medium">{f.label}</label>
              {!isDefault && f.default !== "" && (
                <button type="button" onClick={() => set(f.default)} className="text-xs text-taupe underline hover:text-brand">
                  Reset to default
                </button>
              )}
            </div>
            {f.kind === "line" ? (
              <input type="text" {...common} />
            ) : (
              <textarea rows={f.kind === "long" ? 22 : 3} {...common} className={`input ${f.kind === "long" ? "font-mono text-[13px] leading-relaxed" : ""}`} />
            )}
            {f.hint && <p className="mt-1 text-xs text-taupe">{f.hint}</p>}
          </div>
        );
      })}
      {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700" role="status">{state.success}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
