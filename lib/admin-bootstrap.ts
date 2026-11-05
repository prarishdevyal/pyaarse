export const EXAMPLE_ADMIN_PASSWORDS = ["change-me-please"];
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

export function adminPasswordProblem(pw: string): string | null {
  if (EXAMPLE_ADMIN_PASSWORDS.includes(pw)) return "ADMIN_PASSWORD is still the example value";
  if (pw.length < MIN_ADMIN_PASSWORD_LENGTH) return `ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`;
  return null;
}

export type ExistingUser = { role: "customer" | "admin"; passwordMatches: boolean } | null;

export type BootstrapAction =
  | "create"
  | "promote"
  | "keep-admin"
  | "refuse-weak-password"
  | "refuse-unverified-account";

/**
 * Decides what the seed does for ADMIN_EMAIL. An existing customer account is only
 * promoted when it already has ADMIN_PASSWORD, i.e. the operator provably owns it —
 * otherwise anyone could pre-register the admin address and keep their own password.
 */
export function decideAdminBootstrap(existing: ExistingUser, password: string): BootstrapAction {
  if (existing?.role === "admin") return "keep-admin";
  if (adminPasswordProblem(password)) return "refuse-weak-password";
  if (!existing) return "create";
  return existing.passwordMatches ? "promote" : "refuse-unverified-account";
}
