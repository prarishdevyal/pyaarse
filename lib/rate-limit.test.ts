import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit then blocks until the window resets", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
    expect(rl.hit("a")).toBe(true);
    expect(rl.hit("a")).toBe(true);
    expect(rl.hit("a")).toBe(false);
    expect(rl.hit("b")).toBe(true);
    t = 1000;
    expect(rl.hit("a")).toBe(true);
  });
});
