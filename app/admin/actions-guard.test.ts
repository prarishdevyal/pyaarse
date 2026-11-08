import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Server actions can be called directly from any browser, so each one must check for an admin itself.
const src = readFileSync(join(import.meta.dirname, "actions.ts"), "utf8");
const actions = [...src.matchAll(/export async function (\w+)\(/g)].map((m) => ({ name: m[1], at: m.index! }));
// Signing in, out, accepting an invite and asking for a reset link happen before there is an admin session.
const PUBLIC = new Set(["adminLogin", "adminLogout", "completeAdminInvite", "adminRequestPasswordReset"]);

describe("admin actions", () => {
  it("are found", () => expect(actions.length).toBeGreaterThan(10));
  for (const [i, a] of actions.entries()) {
    if (PUBLIC.has(a.name)) continue;
    it(`${a.name} requires an admin`, () => {
      const body = src.slice(a.at, actions[i + 1]?.at ?? src.length);
      expect(body).toMatch(/await requireAdmin\(\)/);
    });
  }
});
