import "server-only";
import { redirect } from "next/navigation";
import { userFromClaims, type CurrentUser } from "./auth-claims";
import { createSupabaseServerClient } from "./supabase/server";
import { currentAdmin } from "./admin-auth";

export type { CurrentUser };

/** The signed-in user, from a JWT verified against the project's signing keys. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  return userFromClaims(data?.claims);
}

/** For admin pages and actions: the admin's own signed session (lib/admin-auth.ts), not Supabase's. Paths are relative to the admin subdomain. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await currentAdmin();
  if (!user) redirect("/login");
  return user;
}
