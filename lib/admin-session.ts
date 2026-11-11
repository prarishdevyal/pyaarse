import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Admin sign-in lasts a week, then the admin signs in again. */
export const ADMIN_SESSION_SECONDS = 7 * 24 * 3600;
export const ADMIN_COOKIE = "pyaarse_admin";

export type AdminSession = {
  /** auth.users id */
  sub: string;
  /** Changes when the password changes, which signs the admin out everywhere. */
  pw: string;
  /** Expiry, in seconds since 1970. */
  exp: number;
};

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const mac = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest();

function checkSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be set (at least 32 characters).");
  return secret;
}

/** Short fingerprint of the stored password hash (never the hash itself) to tie a session to the current password. */
export function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

export function signAdminSession(s: AdminSession, secret: string | undefined): string {
  const body = b64(JSON.stringify({ sub: s.sub, pw: s.pw, exp: s.exp }));
  return `${body}.${b64(mac(body, checkSecret(secret)))}`;
}

/** The session in a cookie value, or null if it was tampered with, is malformed or has expired. */
export function verifyAdminSession(token: string | undefined, secret: string | undefined, nowSeconds = Math.floor(Date.now() / 1000)): AdminSession | null {
  if (!token) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const expected = mac(body, checkSecret(secret));
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof s?.sub !== "string" || typeof s?.pw !== "string" || typeof s?.exp !== "number") return null;
    return s.exp > nowSeconds ? { sub: s.sub, pw: s.pw, exp: s.exp } : null;
  } catch {
    return null;
  }
}

/** An auth.users row as read for admin sign-in. */
export type AdminRow = {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  role: string | null;
  name: string | null;
  banned_until: Date | null;
  deleted_at: Date | null;
};

/** True if this account may use the admin: an admin, with a password, not banned or deleted. */
export function isUsableAdmin(row: AdminRow | undefined, now = new Date()): row is AdminRow & { email: string; encrypted_password: string } {
  return !!row && row.role === "admin" && !!row.email && !!row.encrypted_password && !row.deleted_at && !(row.banned_until && new Date(row.banned_until) > now);
}
