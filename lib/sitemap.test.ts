import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";

describe("buildSitemap", () => {
  const map = buildSitemap("https://www.pyaarse.net/", [{ slug: "rose-oud", createdAt: new Date("2026-11-01T00:00:00Z") }], [{ slug: "gifting" }]);
  const urls = map.map((e) => e.url);
  it("lists the public pages, collections and products on the shop domain", () => {
    expect(urls).toContain("https://www.pyaarse.net");
    expect(urls).toContain("https://www.pyaarse.net/shop");
    expect(urls).toContain("https://www.pyaarse.net/terms");
    expect(urls).toContain("https://www.pyaarse.net/shop?collection=gifting");
    expect(urls).toContain("https://www.pyaarse.net/product/rose-oud");
  });
  it("leaves out private pages", () => {
    for (const p of ["/cart", "/checkout", "/account", "/wishlist", "/login", "/admin"]) {
      expect(urls.some((u) => u.endsWith(p))).toBe(false);
    }
  });
});
