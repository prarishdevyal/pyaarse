/** Replaces {name} placeholders in admin-edited text, e.g. "Only {n} left". Unknown placeholders are left as typed. */
export function fillText(s: string, vars?: Record<string, string | number>): string {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}
