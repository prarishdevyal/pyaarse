import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "./canonical-url";

describe("canonicalRedirect", () => {
  it("moves plain http to https, keeping path and query", () => {
    expect(canonicalRedirect("http://www.pyaarse.net/checkout?x=1")).toBe("https://www.pyaarse.net/checkout?x=1");
    expect(canonicalRedirect("http://admin.pyaarse.net/orders")).toBe("https://admin.pyaarse.net/orders");
  });

  it("sends the bare domain to www over https", () => {
    expect(canonicalRedirect("http://pyaarse.net/shop")).toBe("https://www.pyaarse.net/shop");
    expect(canonicalRedirect("https://pyaarse.net/")).toBe("https://www.pyaarse.net/");
  });

  it("leaves https and local development alone", () => {
    expect(canonicalRedirect("https://www.pyaarse.net/cart")).toBeNull();
    expect(canonicalRedirect("http://localhost:8787/cart")).toBeNull();
    expect(canonicalRedirect("http://127.0.0.1:3000/")).toBeNull();
  });
});
