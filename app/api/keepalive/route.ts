import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { pruneRateLimits } from "@/lib/limits";

export const dynamic = "force-dynamic";

// Called daily by Vercel Cron so the free Supabase project never counts as inactive; also clears old rate-limit rows.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  await db.execute(sql`select 1`);
  await pruneRateLimits();
  return Response.json({ ok: true, at: new Date().toISOString() });
}
