import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Splits a server-actions file into { name: body } for each exported function. */
function actions(file: string): Record<string, string> {
  const src = readFileSync(new URL(file, import.meta.url), "utf8");
  const parts = src.split(/^export async function /m).slice(1);
  return Object.fromEntries(parts.map((p) => [p.slice(0, p.indexOf("(")), p]));
}

describe("rate limits", () => {
  // Anything a visitor can call must be rate limited. Logging out is harmless.
  it.each(Object.entries(actions("./actions.ts")).filter(([n]) => n !== "logout"))("shop action %s is rate limited", (_, body) => {
    expect(body).toMatch(/limits\.\w+\.hit\(/);
  });

  // Admin pages sit behind the admin login; these are the public ones and the ones that send email.
  it.each(["adminLogin", "completeAdminInvite", "adminRequestPasswordReset", "resendInvoice", "inviteAdminAction"])("admin action %s is rate limited", (name) => {
    expect(actions("./admin/actions.ts")[name]).toMatch(/limits\.\w+\.hit\(/);
  });
});
