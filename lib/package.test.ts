import { describe, expect, it } from "vitest";
import { describePackage, formatWeight, packageProblem, parcelWeight } from "./package";

const rose = { weightGrams: 491, lengthCm: 24, widthCm: 16, heightCm: 6 };
const laxmi = { weightGrams: 288, lengthCm: 20.4, widthCm: 20.4, heightCm: 7.7 };
const none = { weightGrams: null, lengthCm: null, widthCm: null, heightCm: null };

describe("describePackage", () => {
  it("shows weight and box size", () => {
    expect(describePackage(rose)).toBe("491 g · 24 × 16 × 6 cm");
    expect(describePackage(laxmi)).toBe("288 g · 20.4 × 20.4 × 7.7 cm");
    expect(describePackage({ ...none, weightGrams: 121 })).toBe("121 g");
    expect(describePackage(none)).toBeNull();
  });
});

describe("parcelWeight", () => {
  it("adds weight × quantity and counts lines without a weight", () => {
    expect(parcelWeight([{ quantity: 2, pkg: rose }, { quantity: 1, pkg: laxmi }])).toEqual({ grams: 1270, missing: 0 });
    expect(parcelWeight([{ quantity: 1, pkg: rose }, { quantity: 1, pkg: none }, { quantity: 1, pkg: null }])).toEqual({ grams: 491, missing: 2 });
    expect(formatWeight(1270)).toBe("1,270 g (1.27 kg)");
    expect(formatWeight(491)).toBe("491 g");
  });
});

describe("packageProblem", () => {
  it("accepts complete, partial-weight-only and empty details", () => {
    expect(packageProblem(rose)).toBeNull();
    expect(packageProblem(none)).toBeNull();
    expect(packageProblem({ ...none, weightGrams: 100 })).toBeNull();
  });
  it("rejects bad or half-filled details", () => {
    expect(packageProblem({ ...rose, weightGrams: 0 })).toMatch(/Weight/);
    expect(packageProblem({ ...rose, weightGrams: 12.5 })).toMatch(/Weight/);
    expect(packageProblem({ ...none, lengthCm: 10, widthCm: 10 })).toMatch(/all three/);
    expect(packageProblem({ ...rose, heightCm: 0 })).toMatch(/between/);
  });
});
