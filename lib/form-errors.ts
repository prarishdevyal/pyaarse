import type { z } from "zod";

type Shape = Record<string, z.ZodType>;

/** First error message for one field, using that field's rule from the schema (same rules the server uses). */
export function fieldError(shape: Shape, name: string, value: unknown): string | undefined {
  const rule = shape[name];
  if (!rule) return undefined;
  const r = rule.safeParse(value);
  return r.success ? undefined : r.error.issues[0]?.message;
}

/** All field errors for a form's values (first message per field). */
export function formErrors(shape: Shape, values: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of Object.keys(shape)) {
    const msg = fieldError(shape, name, values[name] ?? "");
    if (msg) out[name] = msg;
  }
  return out;
}
