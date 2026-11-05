import { describe, expect, it } from "vitest";
import { adminPasswordProblem, decideAdminBootstrap } from "./admin-bootstrap";

const strong = "a-long-strong-password";

describe("adminPasswordProblem", () => {
  it("rejects the example password and short passwords", () => {
    expect(adminPasswordProblem("change-me-please")).toMatch(/example/);
    expect(adminPasswordProblem("short")).toMatch(/12/);
    expect(adminPasswordProblem(strong)).toBeNull();
  });
});

describe("decideAdminBootstrap", () => {
  it("creates the admin when no account exists", () => {
    expect(decideAdminBootstrap(null, strong)).toBe("create");
  });
  it("refuses to create an admin with a weak or example password", () => {
    expect(decideAdminBootstrap(null, "change-me-please")).toBe("refuse-weak-password");
  });
  it("does not promote a pre-registered account with a different password", () => {
    expect(decideAdminBootstrap({ role: "customer", passwordMatches: false }, strong)).toBe("refuse-unverified-account");
  });
  it("promotes an existing account only when it already has ADMIN_PASSWORD", () => {
    expect(decideAdminBootstrap({ role: "customer", passwordMatches: true }, strong)).toBe("promote");
  });
  it("leaves an existing admin alone", () => {
    expect(decideAdminBootstrap({ role: "admin", passwordMatches: false }, "change-me-please")).toBe("keep-admin");
  });
});
