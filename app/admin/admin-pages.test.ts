import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Layouts and pages render independently in the App Router, so every admin page must
// check the role itself instead of relying on (panel)/layout.tsx alone.
const panel = path.join(import.meta.dirname, "(panel)");
const pages = readdirSync(panel, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith("page.tsx"))
  .map((f) => path.join(panel, f));

describe("admin panel pages", () => {
  it("finds the pages", () => expect(pages.length).toBeGreaterThanOrEqual(8));

  it.each(pages.map((p) => [path.relative(panel, p), p]))("%s calls requireAdmin() before reading data", (_, p) => {
    const src = readFileSync(p, "utf8");
    const body = src.slice(src.indexOf("export default async function"));
    const firstAwait = body.indexOf("await ");
    expect(firstAwait).toBeGreaterThan(-1);
    expect(body.slice(firstAwait, firstAwait + "await requireAdmin()".length)).toBe("await requireAdmin()");
  });
});
