import "server-only";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "./db";
import type { CurrentUser } from "./auth-claims";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, isUsableAdmin, passwordFingerprint, signAdminSession, verifyAdminSession, type AdminRow } from "./admin-session";

// Admin sign-in checks the password Supabase Auth stores (bcrypt, in auth.users) straight from the database,
// and keeps the session in our own signed cookie. So the admin keeps working even when Supabase's
// login service is unavailable. Invites and password resets still go through Supabase Auth.

// Compared against when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Hn8xMc9hMfTYNYcFj0f6YYHXmHle";

async function adminRow(where: ReturnType<typeof sql>): Promise<AdminRow | undefined> {
  const rows = await db.execute<AdminRow>(sql`
    select id::text, email, encrypted_password, raw_app_meta_data->>'role' as role, raw_user_meta_data->>'name' as name, banned_until, deleted_at
    from auth.users where ${where} limit 1`);
  return rows[0];
}

const toUser = (r: AdminRow & { email: string }): CurrentUser => ({ id: r.id, email: r.email, name: r.name?.trim() || r.email.split("@")[0], phone: null, role: "admin" });

/** The admin account for this email and password, or null. */
export async function checkAdminPassword(email: string, password: string): Promise<CurrentUser | null> {
  const row = await adminRow(sql`lower(email) = ${email.trim().toLowerCase()}`);
  const ok = await bcrypt.compare(password, row?.encrypted_password || DUMMY_HASH);
  return ok && isUsableAdmin(row) ? toUser(row) : null;
}

/** Signs the admin in on this host (the admin subdomain). */
export async function startAdminSession(userId: string): Promise<void> {
  const row = await adminRow(sql`id = ${userId}::uuid`);
  if (!isUsableAdmin(row)) throw new Error("Not an admin account.");
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const token = signAdminSession({ sub: row.id, pw: passwordFingerprint(row.encrypted_password), exp }, process.env.ADMIN_SESSION_SECRET);
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_SESSION_SECONDS });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** The signed-in admin, or null. Re-checked against the account each time, so a password change or removed role signs them out. */
export async function currentAdmin(): Promise<CurrentUser | null> {
  const session = verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
  if (!session) return null;
  const row = await adminRow(sql`id = ${session.sub}::uuid`);
  if (!isUsableAdmin(row) || passwordFingerprint(row.encrypted_password) !== session.pw) return null;
  return toUser(row);
}
