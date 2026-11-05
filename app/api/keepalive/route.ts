import { sql } from "drizzle-orm";
import { releaseExpiredOrders } from "@/lib/orders";
import { db } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { pruneRateLimits } from "@/lib/limits";

export const dynamic = "force-dynamic";

// Called daily by Vercel Cron so the free Supabase project never counts as inactive.
// Also cancels unpaid orders past their time (returning stock) and clears old rate-limit rows.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  await db.execute(sql`select 1`);
  const cancelled = await releaseExpiredOrders();
  await pruneRateLimits();
  return Response.json({ ok: true, cancelled, at: new Date().toISOString() });
}
