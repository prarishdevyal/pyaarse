import { describe, expect, it } from "vitest";
import { CONTENT_FIELDS, CONTENT_GROUPS, DEFAULT_HERO_IMAGE, HERO_IMAGE_KEY, cleanContentEdits, contentLookup, heroImageUrl } from "./content-defaults";

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

describe("hero image", () => {
  const supa = "https://abc.supabase.co";
  const uploaded = `${supa}/storage/v1/object/public/product-images/0123456789abcdef01234567.webp`;
  it("uses the uploaded photo, else the original", () => {
    expect(heroImageUrl(uploaded, supa)).toBe(uploaded);
    expect(heroImageUrl(undefined, supa)).toBe(DEFAULT_HERO_IMAGE);
    expect(heroImageUrl("", supa)).toBe(DEFAULT_HERO_IMAGE);
  });
  it("ignores anything that isn't one of our images", () => {
    expect(heroImageUrl("https://evil.example/x.jpg", supa)).toBe(DEFAULT_HERO_IMAGE);
    expect(heroImageUrl("javascript:alert(1)", supa)).toBe(DEFAULT_HERO_IMAGE);
  });
  it("is never touched by the text form", () => {
    const r = cleanContentEdits({ [HERO_IMAGE_KEY]: "https://evil.example/x.jpg" });
    expect(r.set).toEqual({});
    expect(r.clear).toEqual([]);
  });
});
