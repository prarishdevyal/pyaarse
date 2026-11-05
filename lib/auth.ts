import "server-only";
import { redirect } from "next/navigation";
import { userFromClaims, type CurrentUser } from "./auth-claims";
import { createSupabaseServerClient } from "./supabase/server";

export type { CurrentUser };

/** The signed-in user, from a JWT verified against the project's signing keys. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  return userFromClaims(data?.claims);
}

/** For admin pages and actions. Paths are relative to the admin subdomain. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");
  return user;
}
