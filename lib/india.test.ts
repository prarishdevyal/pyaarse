import { describe, expect, it } from "vitest";
import { INDIA_STATES, isIndianState, STATE_NAMES } from "./india";

describe("India states", () => {
  it("lists all 28 states and 8 union territories", () => expect(STATE_NAMES).toHaveLength(36));
  it("has at least one city for each", () => {
    for (const s of STATE_NAMES) expect(INDIA_STATES[s].length).toBeGreaterThan(0);
  });
  it("does not treat object keys as states", () => {
    expect(isIndianState("constructor")).toBe(false);
    expect(isIndianState("Maharashtra")).toBe(true);
  });
});
