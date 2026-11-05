import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Supabase exposes the public schema through its Data API using the publishable key.
// Every table must have RLS on (with no policies) so only the server, connecting as
// the database owner, can read or write it.
const dir = path.join(import.meta.dirname, "../../drizzle");
const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(path.join(dir, f), "utf8")).join("\n");

describe("row level security", () => {
  const created = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]);
  const secured = new Set([...sql.matchAll(/ALTER TABLE "(\w+)" ENABLE ROW LEVEL SECURITY/g)].map((m) => m[1]));

  it("finds the tables", () => expect(created.length).toBeGreaterThanOrEqual(7));
  it.each(created)("%s has RLS enabled", (t) => expect(secured.has(t)).toBe(true));
});
