import { describe, expect, it } from "vitest";
import { clientOptions } from "./options";

const session = "postgresql://u:p@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";
const transaction = "postgresql://u:p@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

describe("clientOptions", () => {
  it("uses TLS and prepared statements on the session pooler", () => {
    expect(clientOptions(session)).toEqual({ max: 10, ssl: "require", prepare: true });
  });

  it("disables prepared statements on the transaction pooler", () => {
    expect(clientOptions(transaction).prepare).toBe(false);
  });

  it("keeps one connection per instance on Vercel", () => {
    expect(clientOptions(transaction, { VERCEL: "1" })).toEqual({ max: 1, ssl: "require", prepare: false });
  });

  it("skips TLS for local databases", () => {
    expect(clientOptions("postgresql://u:p@localhost:5432/db").ssl).toBe(false);
    expect(clientOptions(undefined).ssl).toBe(false);
  });
});
