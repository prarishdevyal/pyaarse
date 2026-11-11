import { describe, expect, it } from "vitest";
import { isAuthOutage } from "./auth-outage";

describe("isAuthOutage", () => {
  it("spots a blocked or broken login service", () => {
    expect(isAuthOutage({ name: "AuthApiError", status: 402 })).toBe(true);
    expect(isAuthOutage({ name: "AuthApiError", status: 503 })).toBe(true);
    expect(isAuthOutage({ name: "AuthRetryableFetchError", status: 0 })).toBe(true);
  });
  it("leaves ordinary sign-in problems alone", () => {
    expect(isAuthOutage({ name: "AuthApiError", status: 400 })).toBe(false); // wrong password
    expect(isAuthOutage({ name: "AuthApiError", status: 422 })).toBe(false); // weak password
    expect(isAuthOutage({ name: "AuthApiError", status: 429 })).toBe(false); // Supabase's own rate limit
    expect(isAuthOutage(null)).toBe(false);
    expect(isAuthOutage(undefined)).toBe(false);
  });
});
