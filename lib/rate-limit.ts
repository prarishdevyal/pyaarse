/** Records one hit for `key` and returns the hit count in the current window. */
export type RateLimitStore = (key: string, windowMs: number) => Promise<number>;

/** Fixed-window limiter over a pluggable store (the database in production, memory in tests). */
export function createRateLimiter(opts: { name: string; limit: number; windowMs: number; store: RateLimitStore }) {
  return {
    /** Records a hit; resolves false when the key is over its limit for the current window. */
    async hit(key: string): Promise<boolean> {
      const count = await opts.store(`${opts.name}:${key.toLowerCase()}`, opts.windowMs);
      return count <= opts.limit;
    },
  };
}

export function memoryStore(now: () => number = Date.now): RateLimitStore {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return async (key, windowMs) => {
    const t = now();
    const b = buckets.get(key);
    if (!b || b.resetAt <= t) {
      buckets.set(key, { count: 1, resetAt: t + windowMs });
      return 1;
    }
    return ++b.count;
  };
}
