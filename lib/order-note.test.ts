import { describe, expect, it } from "vitest";
import { ADMIN_NOTE_MAX, cleanAdminNote } from "./order-note";

describe("cleanAdminNote", () => {
  it("trims and keeps line breaks", () => {
    expect(cleanAdminNote("  Call before delivery\r\nGift wrap  ")).toBe("Call before delivery\nGift wrap");
  });
  it("treats blank or missing input as removing the note", () => {
    expect(cleanAdminNote("   ")).toBe("");
    expect(cleanAdminNote(null)).toBe("");
  });
  it("caps the length", () => {
    expect(cleanAdminNote("a".repeat(ADMIN_NOTE_MAX + 50))).toHaveLength(ADMIN_NOTE_MAX);
  });
});
