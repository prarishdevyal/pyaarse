import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
// `next build` imports this module without a database; every real run must set DATABASE_URL.
if (!url && process.env.NEXT_PHASE !== "phase-production-build") throw new Error("DATABASE_URL is not set");

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
// Supabase (and any non-local database) requires TLS.
const isLocal = !url || /@(localhost|127\.0\.0\.1|db)(:\d+)?\//.test(url);
const client = globalForDb.pg ?? postgres(url ?? "", { max: 10, ssl: isLocal ? false : "require" });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
