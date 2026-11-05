import { describe, expect, it } from "vitest";
import { userFromClaims } from "./auth-claims";

const base = { sub: "7b0c1c4e-0000-4000-8000-000000000001", email: "asha@example.com" };

describe("userFromClaims", () => {
  it("returns null without a verified subject and email", () => {
    expect(userFromClaims(null)).toBeNull();
    expect(userFromClaims({ email: "a@b.c" })).toBeNull();
  });
  it("builds a customer with metadata", () => {
    expect(userFromClaims({ ...base, user_metadata: { name: " Asha ", phone: "9876543210" } })).toEqual({
      id: base.sub, email: base.email, name: "Asha", phone: "9876543210", role: "customer",
    });
  });
  it("takes admin only from app_metadata", () => {
    expect(userFromClaims({ ...base, app_metadata: { role: "admin" } })?.role).toBe("admin");
    expect(userFromClaims({ ...base, user_metadata: { role: "admin" } })?.role).toBe("customer");
  });
});
