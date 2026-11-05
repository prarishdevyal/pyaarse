import { describe, expect, it } from "vitest";
import { mergePicked } from "./picked-files";

const f = (name: string, size = 100, lastModified = 1) => ({ name, size, lastModified });

describe("mergePicked", () => {
  it("adds new picks after the existing ones", () => {
    expect(mergePicked([f("a.jpg")], [f("b.jpg"), f("c.jpg")]).map((x) => x.name)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });
  it("skips a photo picked twice", () => {
    expect(mergePicked([f("a.jpg")], [f("a.jpg"), f("b.jpg"), f("b.jpg")]).map((x) => x.name)).toEqual(["a.jpg", "b.jpg"]);
  });
  it("keeps different photos that share a name (e.g. image.jpg from a phone)", () => {
    expect(mergePicked([f("image.jpg", 100, 1)], [f("image.jpg", 200, 2)])).toHaveLength(2);
  });
});
