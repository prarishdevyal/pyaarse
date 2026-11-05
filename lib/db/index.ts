import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { clientOptions } from "./options";

const url = process.env.DATABASE_URL;
// `next build` imports this module without a database; every real run must set DATABASE_URL.
if (!url && process.env.NEXT_PHASE !== "phase-production-build") throw new Error("DATABASE_URL is not set");

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = globalForDb.pg ?? postgres(url ?? "", clientOptions(url, { VERCEL: process.env.VERCEL }));
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
