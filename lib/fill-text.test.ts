import { describe, expect, it } from "vitest";
import { fillText } from "./fill-text";
import { CLIENT_TEXT_KEYS, CONTENT_FIELDS } from "./content-defaults";

describe("fillText", () => {
  it("fills known placeholders and leaves others", () => {
    expect(fillText("Only {n} left", { n: 3 })).toBe("Only 3 left");
    expect(fillText("Only {count} left", { n: 3 })).toBe("Only {count} left");
    expect(fillText("No vars")).toBe("No vars");
  });
});

describe("CLIENT_TEXT_KEYS", () => {
  it("covers the product and cart labels and only real fields", () => {
    expect(CLIENT_TEXT_KEYS).toContain("product.addToCart");
    expect(CLIENT_TEXT_KEYS).toContain("cart.empty.title");
    expect(CLIENT_TEXT_KEYS.every((k) => CONTENT_FIELDS.has(k))).toBe(true);
  });
});
