export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "customer" | "admin";
};

type Claims = {
  sub?: unknown;
  email?: unknown;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Builds the app user from verified Supabase JWT claims. Admin comes only from
 * app_metadata, which only the server (secret key) can write — never from
 * user_metadata, which users can edit themselves.
 */
export function userFromClaims(claims: Claims): CurrentUser | null {
  const id = str(claims?.sub);
  const email = str(claims?.email);
  if (!id || !email) return null;
  const meta = claims?.user_metadata ?? {};
  return {
    id,
    email,
    name: str(meta.name) ?? email.split("@")[0],
    phone: str(meta.phone),
    role: claims?.app_metadata?.role === "admin" ? "admin" : "customer",
  };
}
