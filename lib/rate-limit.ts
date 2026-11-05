type Bucket = { count: number; resetAt: number };

/** Fixed-window in-memory limiter. Fine for a single app process. */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  return {
    /** Records a hit; returns false when the key is over its limit for the current window. */
    hit(key: string): boolean {
      const t = now();
      if (buckets.size > 10_000) {
        for (const [k, b] of buckets) if (b.resetAt <= t) buckets.delete(k);
      }
      const b = buckets.get(key);
      if (!b || b.resetAt <= t) {
        buckets.set(key, { count: 1, resetAt: t + opts.windowMs });
        return true;
      }
      b.count += 1;
      return b.count <= opts.limit;
    },
  };
}
