import { describe, expect, it } from "vitest";
import { parseInline, parseRichText } from "./rich-text";

describe("parseRichText", () => {
  it("parses headings, paragraphs and lists", () => {
    const blocks = parseRichText("Intro line one\nline two\n\n## Orders\n- **Bold** item\n- second\nAfter list");
    expect(blocks).toEqual([
      { type: "p", parts: [{ text: "Intro line one line two", bold: false }] },
      { type: "h", text: "Orders" },
      { type: "ul", items: [[{ text: "Bold", bold: true }, { text: " item", bold: false }], [{ text: "second", bold: false }]] },
      { type: "p", parts: [{ text: "After list", bold: false }] },
    ]);
  });
  it("keeps HTML as plain text", () => {
    expect(parseRichText("<script>alert(1)</script>")).toEqual([{ type: "p", parts: [{ text: "<script>alert(1)</script>", bold: false }] }]);
  });
  it("handles text without bold markers", () => expect(parseInline("plain")).toEqual([{ text: "plain", bold: false }]));
});

describe("parseInline in product descriptions", () => {
  it("bolds **text** without crossing line breaks", () => {
    const parts = parseInline("Bring home the **Lotus Pond Set** today.\nMade with **love");
    expect(parts.filter((p) => p.bold).map((p) => p.text)).toEqual(["Lotus Pond Set"]);
    expect(parts.map((p) => p.text).join("")).toBe("Bring home the Lotus Pond Set today.\nMade with **love");
  });
});
