export type ConfirmResult = "signed-in" | "verified-other-browser" | "failed";

/**
 * Where an email-confirmation link lands.
 * - signed-in: the link verified and started a session; go on with a "verified" note.
 * - verified-other-browser: Supabase already confirmed the email but the sign-in code can only be used
 *   in the browser that registered (e.g. opened from a phone's mail app), so ask them to log in.
 * - failed: expired or already-used link.
 */
export function confirmRedirect(result: ConfirmResult, next: string): string {
  if (result === "signed-in") return `${next}${next.includes("?") ? "&" : "?"}verified=1`;
  if (result === "verified-other-browser") return `/login?confirm=verified&next=${encodeURIComponent(next)}`;
  return `/login?confirm=failed&next=${encodeURIComponent(next)}`;
}
