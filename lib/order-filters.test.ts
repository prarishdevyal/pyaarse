import { describe, expect, it } from "vitest";
import { cardTotals, likePattern, statusesMatching, ordersHref, parseOrderFilters, rangeStart } from "./order-filters";

describe("parseOrderFilters", () => {
  it("reads status, search and date range", () => {
    expect(parseOrderFilters({ status: "paid", q: "  PY1042 ", range: "7d" })).toEqual({ status: "paid", q: "PY1042", range: "7d" });
  });
  it("ignores unknown values", () => {
    expect(parseOrderFilters({ status: "lost", range: "forever" })).toEqual({ status: null, q: "", range: "all" });
  });
});

describe("rangeStart", () => {
  const now = new Date("2026-11-08T10:00:00Z"); // 15:30 in India
  it("starts today at Indian midnight", () => expect(rangeStart("today", now)!.toISOString()).toBe("2026-11-07T18:30:00.000Z"));
  it("counts today in the last 7 days", () => expect(rangeStart("7d", now)!.toISOString()).toBe("2026-11-01T18:30:00.000Z"));
  it("has no start for all time", () => expect(rangeStart("all", now)).toBeNull());
});

describe("ordersHref", () => {
  const f = { status: "paid" as const, q: "asha", range: "30d" as const };
  it("keeps other filters when one changes", () => expect(ordersHref(f, { status: "shipped" })).toBe("/orders?status=shipped&q=asha&range=30d"));
  it("drops defaults", () => expect(ordersHref({ status: null, q: "", range: "all" })).toBe("/orders"));
});

it("escapes LIKE wildcards in a search", () => expect(likePattern("50%_off")).toBe("%50\\%\\_off%"));

describe("cardTotals", () => {
  it("leaves cancelled orders out of All", () => {
    const cards = cardTotals([{ status: "paid", n: 1, total: 500 }, { status: "cancelled", n: 9, total: 9000 }]);
    expect(cards.find((c) => c.label === "All orders")).toMatchObject({ n: 1, total: 500 });
  });
  it("adds up All and fills missing statuses with zero", () => {
    const cards = cardTotals([
      { status: "paid", n: 2, total: 1000 },
      { status: "delivered", n: 1, total: 500 },
    ]);
    expect(cards.find((c) => c.label === "All orders")).toMatchObject({ n: 3, total: 1500 });
    expect(cards.find((c) => c.label === "Processing")).toMatchObject({ n: 2, total: 1000 });
    expect(cards.find((c) => c.label === "Cancelled")).toBeUndefined();
  });
});

describe("statusesMatching", () => {
  it("finds statuses by their name", () => {
    expect(statusesMatching("Shipped")).toEqual(["shipped"]);
    expect(statusesMatching("processing")).toEqual(["paid"]);
    expect(statusesMatching("deliv")).toEqual(["delivered"]);
    expect(statusesMatching("awaiting")).toEqual(["pending_payment"]);
    expect(statusesMatching("cancelled")).toEqual(["cancelled"]);
  });
  it("ignores short or unrelated words", () => {
    expect(statusesMatching("pa")).toEqual([]);
    expect(statusesMatching("asha")).toEqual([]);
  });
});
