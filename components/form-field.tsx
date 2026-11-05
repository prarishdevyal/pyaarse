import type { ReactNode } from "react";

/** Label + control + inline error, wired up for screen readers. */
export function FormField({
  id, label, hint, error, children, optional,
}: { id: string; label: string; hint?: string; error?: string; children: ReactNode; optional?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="font-normal text-taupe"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-brand" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-taupe">{hint}</p>
      ) : null}
    </div>
  );
}

/** Props that link a control to its FormField error. */
export const invalidProps = (id: string, error?: string) =>
  error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};
