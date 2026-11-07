import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (["node_modules", ".next", ".git", "e2e"].includes(name)) return [];
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [p] : [];
  });
}
const files = [...sourceFiles(join(root, "app")), ...sourceFiles(join(root, "components")), ...sourceFiles(join(root, "lib"))];

describe("payment security guards", () => {
  it("browser code never imports the Cashfree client or payments logic", () => {
    const client = files.filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
    expect(client.length).toBeGreaterThan(0);
    for (const f of client) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/from ["'](@\/lib|\.\.?\/[^"']*)\/(cashfree|payments|pay-link)["']/);
    }
  });

  it("Cashfree keys are never exposed as public env vars", () => {
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/NEXT_PUBLIC_CASHFREE/);
  });

  it("the payments module is server-only", () => {
    expect(readFileSync(join(root, "lib/payments.ts"), "utf8")).toMatch(/^import "server-only";/);
  });

  it("the webhook verifies the signature before acting on the body", () => {
    const src = readFileSync(join(root, "app/api/payments/cashfree/route.ts"), "utf8");
    expect(src.indexOf("verifyWebhookSignature(")).toBeGreaterThan(-1);
    expect(src.indexOf("verifyWebhookSignature(")).toBeLessThan(src.indexOf("webhookOrderId("));
    expect(src).toMatch(/status: 401/);
  });

  it("orders are only marked paid through the server-side check with Cashfree", () => {
    const src = readFileSync(join(root, "lib/payments.ts"), "utf8");
    const markPaid = src.indexOf('set({ status: "paid" })');
    expect(markPaid).toBeGreaterThan(src.indexOf("successfulPayment("));
  });
});
