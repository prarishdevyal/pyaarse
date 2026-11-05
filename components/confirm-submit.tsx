"use client";

import { useState } from "react";

/** Two-step submit button: first click asks, second click submits. */
export function ConfirmSubmit({ label, confirmLabel }: { label: string; confirmLabel: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return <button type="button" onClick={() => setArmed(true)} className="text-sm text-taupe underline hover:text-brand">{label}</button>;
  }
  return (
    <span className="flex items-center gap-3 text-sm">
      <button type="submit" className="rounded-full bg-brand px-4 py-1.5 text-ivory">{confirmLabel}</button>
      <button type="button" onClick={() => setArmed(false)} className="text-taupe underline">Cancel</button>
    </span>
  );
}
