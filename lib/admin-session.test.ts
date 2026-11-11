import { describe, expect, it } from "vitest";
import { isUsableAdmin, passwordFingerprint, signAdminSession, verifyAdminSession } from "./admin-session";

const secret = "x".repeat(40);
const session = { sub: "user-1", pw: passwordFingerprint("$2a$10$hash"), exp: 2_000 };

describe("admin session cookie", () => {
  it("round-trips until it expires", () => {
    const token = signAdminSession(session, secret);
    expect(verifyAdminSession(token, secret, 1_000)).toEqual(session);
    expect(verifyAdminSession(token, secret, 2_000)).toBeNull();
  });
  it("rejects tampering, another secret and junk", () => {
    const token = signAdminSession(session, secret);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ ...session, sub: "someone-else" })).toString("base64url")}.${sig}`;
    expect(verifyAdminSession(forged, secret, 1_000)).toBeNull();
    expect(verifyAdminSession(token, "y".repeat(40), 1_000)).toBeNull();
    expect(verifyAdminSession(`${token}.x`, secret, 1_000)).toBeNull();
    expect(verifyAdminSession("not-a-token", secret, 1_000)).toBeNull();
    expect(verifyAdminSession(undefined, secret, 1_000)).toBeNull();
  });
  it("refuses to work without a strong secret", () => {
    expect(() => signAdminSession(session, undefined)).toThrow(/ADMIN_SESSION_SECRET/);
    expect(() => signAdminSession(session, "short")).toThrow(/ADMIN_SESSION_SECRET/);
  });
  it("fingerprints change with the password and don't reveal the hash", () => {
    const a = passwordFingerprint("$2a$10$aaaa");
    expect(a).not.toBe(passwordFingerprint("$2a$10$bbbb"));
    expect(a).not.toContain("$2a$");
    expect(a).toHaveLength(16);
  });
});

describe("isUsableAdmin", () => {
  const row = { id: "u", email: "a@x.com", encrypted_password: "$2a$10$h", role: "admin", name: null, banned_until: null, deleted_at: null };
  const now = new Date("2026-11-12T00:00:00Z");
  it("accepts an active admin with a password", () => expect(isUsableAdmin(row, now)).toBe(true));
  it("rejects customers, missing, deleted, banned and passwordless accounts", () => {
    expect(isUsableAdmin(undefined, now)).toBe(false);
    expect(isUsableAdmin({ ...row, role: null }, now)).toBe(false);
    expect(isUsableAdmin({ ...row, role: "customer" }, now)).toBe(false);
    expect(isUsableAdmin({ ...row, encrypted_password: "" }, now)).toBe(false);
    expect(isUsableAdmin({ ...row, deleted_at: now }, now)).toBe(false);
    expect(isUsableAdmin({ ...row, banned_until: new Date("2027-01-01") }, now)).toBe(false);
    expect(isUsableAdmin({ ...row, banned_until: new Date("2026-01-01") }, now)).toBe(true);
  });
});
