import { describe, expect, it } from "vitest";
import { CONTENT_FIELDS, CONTENT_GROUPS, cleanContentEdits, contentLookup } from "./content-defaults";

describe("site content", () => {
  it("has unique keys", () => {
    const keys = CONTENT_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("falls back to defaults for missing or blank overrides", () => {
    const t = contentLookup({ "home.hero.cta": "Shop now", "home.story.title": "  " });
    expect(t("home.hero.cta")).toBe("Shop now");
    expect(t("home.story.title")).toBe(CONTENT_FIELDS.get("home.story.title")!.default);
    expect(t("unknown.key")).toBe("");
  });
  it("cleans edits: drops unknown keys, clears empty/default values, enforces limits", () => {
    const r = cleanContentEdits({
      "home.hero.cta": "  Shop   the collection ",
      "home.story.title": "",
      "home.faq.1.q": CONTENT_FIELDS.get("home.faq.1.q")!.default,
      "evil.key": "x",
      "announcement": "x".repeat(201),
    });
    expect(r.set).toEqual({ "home.hero.cta": "Shop the collection" });
    expect(r.clear.sort()).toEqual(["home.faq.1.q", "home.story.title"]);
    expect(r.errors).toHaveLength(1);
  });
  it("ships non-empty legal pages by default", () => {
    expect(CONTENT_FIELDS.get("legal.privacy")!.default).toMatch(/## What we collect/);
    expect(CONTENT_FIELDS.get("legal.terms")!.default).toMatch(/## Orders/);
  });
});
