import "server-only";
import { headers } from "next/headers";
import { createRateLimiter } from "./rate-limit";

const MIN = 60_000;

export const limits = {
  loginByIp: createRateLimiter({ limit: 20, windowMs: 15 * MIN }),
  loginByEmail: createRateLimiter({ limit: 8, windowMs: 15 * MIN }),
  adminLoginByIp: createRateLimiter({ limit: 10, windowMs: 15 * MIN }),
  adminLoginByEmail: createRateLimiter({ limit: 5, windowMs: 15 * MIN }),
  registerByIp: createRateLimiter({ limit: 5, windowMs: 60 * MIN }),
  checkoutByIp: createRateLimiter({ limit: 10, windowMs: 60 * MIN }),
  checkoutByEmail: createRateLimiter({ limit: 5, windowMs: 60 * MIN }),
  contactByIp: createRateLimiter({ limit: 5, windowMs: 60 * MIN }),
  contactByEmail: createRateLimiter({ limit: 3, windowMs: 60 * MIN }),
  quoteByIp: createRateLimiter({ limit: 120, windowMs: MIN }),
};

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

/**
 * Client IP as reported by the reverse proxy. Without a proxy that overwrites
 * X-Forwarded-For this can be spoofed, so per-email limits back up the per-IP ones.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}
