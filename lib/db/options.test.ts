import { describe, expect, it } from "vitest";
import { clientOptions } from "./options";

const session = "postgresql://u:p@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";
const transaction = "postgresql://u:p@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

describe("clientOptions", () => {
  it("uses TLS and prepared statements on the session pooler", () => {
    expect(clientOptions(session)).toMatchObject({ max: 10, ssl: "require", prepare: true });
  });

  it("disables prepared statements and pipelining on the transaction pooler", () => {
    expect(clientOptions(transaction)).toMatchObject({ prepare: false, max_pipeline: 1 });
    expect(clientOptions(session).max_pipeline).toBe(100);
  });

  it("keeps one connection per instance on Vercel", () => {
    expect(clientOptions(transaction, { VERCEL: "1" })).toMatchObject({ max: 1, ssl: "require", prepare: false });
  });

  it("times out instead of hanging and releases idle connections", () => {
    expect(clientOptions(transaction)).toMatchObject({ connect_timeout: 10, idle_timeout: 20, queue_timeout: 15 });
  });

  it("skips TLS for local databases", () => {
    expect(clientOptions("postgresql://u:p@localhost:5432/db").ssl).toBe(false);
    expect(clientOptions(undefined).ssl).toBe(false);
  });
});
