import { describe, expect, it } from "vitest";
import { isNewOrder, NEW_ORDER_MS, updatedAgo } from "./live";

describe("live admin pages", () => {
  it("tags orders from the last 10 minutes as new", () => {
    const now = Date.parse("2026-11-08T10:00:00Z");
    expect(isNewOrder(new Date(now - 60_000), now)).toBe(true);
    expect(isNewOrder(new Date(now - NEW_ORDER_MS - 1), now)).toBe(false);
  });
  it("says how long ago the page updated", () => {
    expect(updatedAgo(2_000)).toBe("just now");
    expect(updatedAgo(15_000)).toBe("15 s ago");
    expect(updatedAgo(130_000)).toBe("2 min ago");
  });
});
