import "server-only";
import { and, isNotNull, ne, sql } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { db, schema } from "./db";
import { supabaseAdmin } from "./supabase/admin";
import { roleChangeProblem, sortUsers, toUserRow, type UserRow } from "./admin-users";
import { buildAdminAddedEmail, buildAdminInviteEmail, sendEmail } from "./notify/email";

const { orders } = schema;

async function allAuthUsers(): Promise<User[]> {
  const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users;
}

/** Every account with its order count and total spent (cancelled orders excluded). */
export async function listUsersWithStats(): Promise<UserRow[]> {
  const [users, stats] = await Promise.all([
    allAuthUsers(),
    db
      .select({ userId: orders.userId, n: sql<number>`count(*)::int`, spent: sql<number>`coalesce(sum(${orders.total}), 0)::int` })
      .from(orders)
      .where(and(isNotNull(orders.userId), ne(orders.status, "cancelled")))
      .groupBy(orders.userId),
  ]);
  const byUser = new Map(stats.map((s) => [s.userId, { orders: s.n, spent: s.spent }]));
  return sortUsers(users.map((u) => toUserRow(u, byUser.get(u.id))));
}

function adminUrl(): string {
  const url = process.env.ADMIN_URL?.replace(/\/+$/, "");
  if (!url) throw new Error("ADMIN_URL is not set");
  return url;
}

type Result = { ok: true; message: string } | { ok: false; error: string };

export async function setUserRole(actor: { id: string; email: string }, targetId: string, makeAdmin: boolean): Promise<Result> {
  const users = await allAuthUsers();
  const target = users.find((u) => u.id === targetId);
  if (!target) return { ok: false, error: "That account no longer exists." };
  const problem = roleChangeProblem({
    actorId: actor.id,
    targetId,
    makeAdmin,
    targetIsAdmin: target.app_metadata?.role === "admin",
    adminCount: users.filter((u) => u.app_metadata?.role === "admin").length,
  });
  if (problem) return { ok: false, error: problem };

  const { error } = await supabaseAdmin().auth.admin.updateUserById(targetId, {
    app_metadata: { ...target.app_metadata, role: makeAdmin ? "admin" : "customer" },
  });
  if (error) return { ok: false, error: error.message };
  if (makeAdmin && target.email) {
    await sendEmail(target.email, buildAdminAddedEmail(`${adminUrl()}/login`, actor.email)).catch((e) => console.error("[admin added email]", e));
  }
  return { ok: true, message: makeAdmin ? `${target.email} is now an admin.` : `${target.email} no longer has admin access.` };
}

/**
 * Invites someone to the admin. New people get a link to choose a password; existing accounts are
 * promoted and told to log in. Someone invited earlier who never finished gets a fresh link.
 */
export async function inviteAdmin(actor: { email: string }, rawEmail: string): Promise<Result> {
  const email = rawEmail.trim().toLowerCase();
  const admin = supabaseAdmin().auth.admin;
  const existing = (await allAuthUsers()).find((u) => u.email?.toLowerCase() === email);

  if (existing?.app_metadata?.role === "admin" && existing.last_sign_in_at) return { ok: false, error: `${email} is already an admin.` };

  if (existing?.last_sign_in_at) {
    const { error } = await admin.updateUserById(existing.id, { app_metadata: { ...existing.app_metadata, role: "admin" } });
    if (error) return { ok: false, error: error.message };
    await sendEmail(email, buildAdminAddedEmail(`${adminUrl()}/login`, actor.email));
    return { ok: true, message: `${email} already had an account. It's now an admin, and they've been emailed.` };
  }

  // New person (invite) or an invite that was never accepted (fresh link).
  const { data, error } = existing
    ? await admin.generateLink({ type: "recovery", email })
    : await admin.generateLink({ type: "invite", email });
  if (error) return { ok: false, error: error.message };
  const user = data.user;
  const { error: roleError } = await admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, role: "admin" } });
  if (roleError) return { ok: false, error: roleError.message };

  const type = existing ? "recovery" : "invite";
  const link = `${adminUrl()}/set-password?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${type}`;
  await sendEmail(email, buildAdminInviteEmail(link, actor.email));
  return { ok: true, message: `Invite sent to ${email}. The link works for 24 hours.` };
}
