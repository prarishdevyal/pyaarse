import { describe, expect, it } from "vitest";
import { groupVariants, variantLabel } from "./variants";

describe("variants", () => {
  it("labels a sub-variant after its variant", () => {
    expect(variantLabel("Box of 4", "Rose")).toBe("Box of 4 · Rose");
    expect(variantLabel("Box of 4", "")).toBe("Box of 4");
    expect(variantLabel("Box of 4", "  ")).toBe("Box of 4");
  });
  it("groups sub-variants under their variant, keeping the order", () => {
    const rows = [{ name: "Box of 4", subName: "Rose" }, { name: "Single", subName: "" }, { name: "Box of 4", subName: "Oud" }];
    expect(groupVariants(rows)).toEqual([
      { name: "Box of 4", options: [rows[0], rows[2]] },
      { name: "Single", options: [rows[1]] },
    ]);
  });
});
