import { describe, expect, it } from "vitest";
import { slideIndex, stepIndex } from "./gallery";

describe("slideIndex", () => {
  it("rounds to the nearest slide", () => {
    expect(slideIndex(0, 400, 3)).toBe(0);
    expect(slideIndex(190, 400, 3)).toBe(0);
    expect(slideIndex(210, 400, 3)).toBe(1);
    expect(slideIndex(800, 400, 3)).toBe(2);
  });
  it("stays in range (overscroll, empty gallery)", () => {
    expect(slideIndex(-50, 400, 3)).toBe(0);
    expect(slideIndex(5000, 400, 3)).toBe(2);
    expect(slideIndex(100, 0, 3)).toBe(0);
  });
});

describe("stepIndex", () => {
  it("moves and wraps around", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
  });
});
