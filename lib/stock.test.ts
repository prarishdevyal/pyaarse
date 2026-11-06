import { describe, expect, it } from "vitest";
import { filterStock, stockStatus, stockSummary } from "./stock";

describe("stockStatus", () => {
  it("splits out, low (1–3) and in stock", () => {
    expect([0, -1, 1, 3, 4].map(stockStatus)).toEqual(["out", "out", "low", "low", "ok"]);
  });
});

describe("stockSummary", () => {
  it("counts units and low/out options of visible products only", () => {
    expect(stockSummary([
      { stock: 10, visible: true }, { stock: 2, visible: true }, { stock: 0, visible: true }, { stock: 50, visible: false },
    ])).toEqual({ units: 12, options: 3, low: 1, out: 1 });
  });
});

describe("filterStock", () => {
  const rows = [{ name: "B", stock: 8 }, { name: "A", stock: 0 }, { name: "C", stock: 2 }, { name: "D", stock: 2 }];
  it("sorts lowest first and filters", () => {
    expect(filterStock(rows, "all").map((r) => r.name)).toEqual(["A", "C", "D", "B"]);
    expect(filterStock(rows, "low").map((r) => r.name)).toEqual(["A", "C", "D"]);
    expect(filterStock(rows, "out").map((r) => r.name)).toEqual(["A"]);
  });
});
