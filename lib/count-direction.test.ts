import { describe, expect, it } from "vitest";
import { countDirection } from "./count-direction";

describe("countDirection", () => {
  it("rolls up on increase and down on decrease", () => {
    expect(countDirection(1, 2)).toBe("up");
    expect(countDirection(3, 2)).toBe("down");
  });
  it("does not animate on first render or when unchanged", () => {
    expect(countDirection(null, 1)).toBeNull();
    expect(countDirection(2, 2)).toBeNull();
  });
});
