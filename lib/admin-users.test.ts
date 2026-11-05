import { describe, expect, it } from "vitest";
import { roleChangeProblem, sortUsers, toUserRow } from "./admin-users";

const base = { id: "u1", email: "a@b.co", created_at: "2026-11-01T10:00:00Z" };

describe("toUserRow", () => {
  it("reads name, phone and role; role only from app_metadata", () => {
    const r = toUserRow(
      { ...base, email_confirmed_at: "2026-11-01T10:05:00Z", app_metadata: { role: "admin" }, user_metadata: { name: " Asha ", phone: "9876543210" } },
      { orders: 3, spent: 2500 },
    );
    expect(r).toMatchObject({ name: "Asha", phone: "9876543210", role: "admin", confirmed: true, orders: 3, spent: 2500 });
    expect(toUserRow({ ...base, user_metadata: { role: "admin" } }).role).toBe("customer");
  });
  it("defaults missing details", () => {
    expect(toUserRow(base)).toMatchObject({ name: "", phone: "", role: "customer", confirmed: false, lastSignIn: null, orders: 0, spent: 0 });
  });
});

describe("sortUsers", () => {
  it("puts admins first, then newest", () => {
    const rows = [
      toUserRow({ ...base, id: "old", created_at: "2026-01-01T00:00:00Z" }),
      toUserRow({ ...base, id: "new", created_at: "2026-11-01T00:00:00Z" }),
      toUserRow({ ...base, id: "admin", created_at: "2025-01-01T00:00:00Z", app_metadata: { role: "admin" } }),
    ];
    expect(sortUsers(rows).map((r) => r.id)).toEqual(["admin", "new", "old"]);
  });
});

describe("roleChangeProblem", () => {
  const p = { actorId: "me", targetId: "them", makeAdmin: true, targetIsAdmin: false, adminCount: 1 };
  it("allows making someone an admin", () => expect(roleChangeProblem(p)).toBeNull());
  it("allows removing another admin while one remains", () =>
    expect(roleChangeProblem({ ...p, makeAdmin: false, targetIsAdmin: true, adminCount: 2 })).toBeNull());
  it("stops you removing yourself", () =>
    expect(roleChangeProblem({ ...p, targetId: "me", makeAdmin: false, targetIsAdmin: true, adminCount: 3 })).toMatch(/your own/));
  it("keeps at least one admin", () =>
    expect(roleChangeProblem({ ...p, makeAdmin: false, targetIsAdmin: true, adminCount: 1 })).toMatch(/at least one/));
  it("rejects no-op changes", () => {
    expect(roleChangeProblem({ ...p, targetIsAdmin: true })).toMatch(/already/);
    expect(roleChangeProblem({ ...p, makeAdmin: false })).toMatch(/isn't an admin/);
  });
});
