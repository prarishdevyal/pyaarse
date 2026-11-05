import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "./db";
import { createRateLimiter, type RateLimitStore } from "./rate-limit";

const MIN = 60_000;

/** Counts live in Postgres so every serverless instance shares them. One atomic upsert per hit. */
const dbStore: RateLimitStore = async (key, windowMs) => {
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
    returning count`);
  return Number(rows[0].count);
};

const limiter = (name: string, limit: number, windowMs: number) => createRateLimiter({ name, limit, windowMs, store: dbStore });

export const limits = {
  loginByIp: limiter("login-ip", 20, 15 * MIN),
  loginByEmail: limiter("login-email", 8, 15 * MIN),
  adminLoginByIp: limiter("admin-login-ip", 10, 15 * MIN),
  adminLoginByEmail: limiter("admin-login-email", 5, 15 * MIN),
  registerByIp: limiter("register-ip", 5, 60 * MIN),
  resetByIp: limiter("reset-ip", 5, 60 * MIN),
  resetByEmail: limiter("reset-email", 3, 60 * MIN),
  checkoutByIp: limiter("checkout-ip", 10, 60 * MIN),
  checkoutByEmail: limiter("checkout-email", 5, 60 * MIN),
  contactByIp: limiter("contact-ip", 5, 60 * MIN),
  contactByEmail: limiter("contact-email", 3, 60 * MIN),
  quoteByIp: limiter("quote-ip", 120, MIN),
};

/** Deletes expired counters. Run daily by the keep-alive cron. */
export async function pruneRateLimits(): Promise<void> {
  await db.execute(sql`delete from rate_limits where reset_at <= now()`);
}

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

/**
 * Client IP as reported by the reverse proxy (Vercel sets x-forwarded-for itself). Without a proxy that
 * overwrites X-Forwarded-For this can be spoofed, so per-email limits back up the per-IP ones.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}
