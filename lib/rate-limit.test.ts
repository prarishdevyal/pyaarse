import { describe, expect, it } from "vitest";
import { createRateLimiter, memoryStore } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit then blocks until the window resets", async () => {
    let t = 0;
    const rl = createRateLimiter({ name: "t", limit: 2, windowMs: 1000, store: memoryStore(() => t) });
    expect(await rl.hit("a")).toBe(true);
    expect(await rl.hit("a")).toBe(true);
    expect(await rl.hit("a")).toBe(false);
    expect(await rl.hit("b")).toBe(true);
    t = 1000;
    expect(await rl.hit("a")).toBe(true);
  });

  it("keeps limiters apart by name and ignores email case", async () => {
    const store = memoryStore(() => 0);
    const a = createRateLimiter({ name: "a", limit: 1, windowMs: 1000, store });
    const b = createRateLimiter({ name: "b", limit: 1, windowMs: 1000, store });
    expect(await a.hit("X@Mail.com")).toBe(true);
    expect(await a.hit("x@mail.com")).toBe(false);
    expect(await b.hit("x@mail.com")).toBe(true);
  });
});
