import { describe, expect, it } from "vitest";
import { moveItem } from "./move-item";

describe("moveItem", () => {
  const l = ["a", "b", "c", "d"];
  it("moves left, right and to the front", () => {
    expect(moveItem(l, 2, 1)).toEqual(["a", "c", "b", "d"]);
    expect(moveItem(l, 1, 2)).toEqual(["a", "c", "b", "d"]);
    expect(moveItem(l, 3, 0)).toEqual(["d", "a", "b", "c"]);
  });
  it("stays put at the ends and doesn't change the original", () => {
    expect(moveItem(l, 0, -1)).toEqual(l);
    expect(moveItem(l, 3, 9)).toEqual(l);
    expect(moveItem(l, 7, 0)).toEqual(l);
    expect(l).toEqual(["a", "b", "c", "d"]);
  });
});
