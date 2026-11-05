import { describe, expect, it } from "vitest";
import { safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext("/shop?collection=floral#top")).toBe("/shop?collection=floral#top");
  });

  it.each([
    "/\\evil.example",
    "/\\/evil.example",
    "//evil.example",
    "https://evil.example",
    "/\tevil.example",
    "/%09/evil.example".replace("%09", "\t"),
    "javascript:alert(1)",
    "",
  ])("rejects off-site or malformed target %j", (v) => {
    expect(safeNext(v)).toBe("/account");
  });

  it("rejects non-strings", () => {
    expect(safeNext(null)).toBe("/account");
    expect(safeNext(undefined, "/")).toBe("/");
  });
});
