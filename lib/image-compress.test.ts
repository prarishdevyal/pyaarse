import { describe, expect, it } from "vitest";
import { downscaleSteps, fitWithin, formatMB, MAX_EDGE, needsCompression, totalBytes } from "./image-compress";

describe("fitWithin", () => {
  it("shrinks the longest edge to the max and keeps the aspect ratio", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000)).toEqual({ width: 1000, height: 2000 });
  });
  it("never enlarges", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
});

describe("needsCompression", () => {
  it("leaves small, already-web-sized photos untouched", () => {
    expect(needsCompression(1600, 1200, 400 * 1024)).toBe(false);
  });
  it("compresses oversized dimensions or heavy files", () => {
    expect(needsCompression(MAX_EDGE + 1, 100, 1000)).toBe(true);
    expect(needsCompression(1600, 1200, 3 * 1024 * 1024)).toBe(true);
  });
});

describe("downscaleSteps", () => {
  it("halves until within 2x of the target, then lands exactly on it", () => {
    const target = fitWithin(8000, 6000);
    expect(downscaleSteps(8000, 6000, target)).toEqual([{ width: 4000, height: 3000 }, target]);
  });
  it("goes straight to the target for small reductions", () => {
    const target = fitWithin(3000, 2000);
    expect(downscaleSteps(3000, 2000, target)).toEqual([target]);
  });
});

describe("helpers", () => {
  it("sums and formats sizes", () => {
    expect(totalBytes([{ size: 1024 * 1024 }, { size: 1024 * 1024 }])).toBe(2 * 1024 * 1024);
    expect(formatMB(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});
