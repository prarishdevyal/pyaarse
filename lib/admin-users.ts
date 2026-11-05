export type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "customer" | "admin";
  joined: Date;
  lastSignIn: Date | null;
  confirmed: boolean;
  orders: number;
  spent: number;
};

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** One row for the admin Users table: the Supabase account plus its order totals. */
export function toUserRow(u: AuthUser, stats?: { orders: number; spent: number }): UserRow {
  return {
    id: u.id,
    email: u.email ?? "",
    name: str(u.user_metadata?.name) || str(u.user_metadata?.full_name),
    phone: str(u.user_metadata?.phone),
    role: u.app_metadata?.role === "admin" ? "admin" : "customer",
    joined: new Date(u.created_at),
    lastSignIn: u.last_sign_in_at ? new Date(u.last_sign_in_at) : null,
    confirmed: !!u.email_confirmed_at,
    orders: stats?.orders ?? 0,
    spent: stats?.spent ?? 0,
  };
}

/** Admins first, then newest accounts first. */
export function sortUsers(rows: UserRow[]): UserRow[] {
  return [...rows].sort((a, b) => (a.role === b.role ? b.joined.getTime() - a.joined.getTime() : a.role === "admin" ? -1 : 1));
}

/** Why a role change isn't allowed, or null if it is. Keeps at least one admin and stops you locking yourself out. */
export function roleChangeProblem(p: { actorId: string; targetId: string; makeAdmin: boolean; targetIsAdmin: boolean; adminCount: number }): string | null {
  if (p.makeAdmin === p.targetIsAdmin) return p.makeAdmin ? "This account is already an admin." : "This account isn't an admin.";
  if (!p.makeAdmin && p.actorId === p.targetId) return "You can't remove your own admin access. Ask another admin to do it.";
  if (!p.makeAdmin && p.adminCount <= 1) return "There must always be at least one admin.";
  return null;
}
