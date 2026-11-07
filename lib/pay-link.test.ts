import { describe, expect, it } from "vitest";
import { checkPayToken, payPath, payToken } from "./pay-link";

const env = { SUPABASE_SECRET_KEY: "server-secret" };

describe("pay links", () => {
  it("accepts the token for its own order only", () => {
    const t = payToken("PY1042", env);
    expect(t).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(checkPayToken("PY1042", t, env)).toBe(true);
    expect(checkPayToken("PY1043", t, env)).toBe(false);
  });

  it("rejects missing, malformed and forged tokens", () => {
    expect(checkPayToken("PY1042", undefined, env)).toBe(false);
    expect(checkPayToken("PY1042", "", env)).toBe(false);
    expect(checkPayToken("PY1042", "a".repeat(24), env)).toBe(false);
    expect(checkPayToken("PY1042", payToken("PY1042", { SUPABASE_SECRET_KEY: "other" }), env)).toBe(false);
  });

  it("prefers PAY_LINK_SECRET and needs some secret", () => {
    expect(payToken("PY1", { ...env, PAY_LINK_SECRET: "x" })).not.toBe(payToken("PY1", env));
    expect(() => payToken("PY1", {})).toThrow();
  });

  it("builds the order page link", () => {
    expect(payPath("PY1042", env)).toBe(`/order-confirmed?n=PY1042&t=${payToken("PY1042", env)}`);
  });
});
