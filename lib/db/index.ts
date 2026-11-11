import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";
import { clientOptions } from "./options";

const url = process.env.DATABASE_URL;
// `next build` imports this module without a database; every real run must set DATABASE_URL.
if (!url && process.env.NEXT_PHASE !== "phase-production-build") throw new Error("DATABASE_URL is not set");

type Db = ReturnType<typeof drizzle<typeof schema>>;
const connect = (max?: number) => drizzle(postgres(url ?? "", { ...clientOptions(url, { VERCEL: process.env.VERCEL }), ...(max ? { max } : {}) }), { schema });

// Cloudflare Workers can't reuse a database connection opened by another request, so there each request gets
// its own (kept for that request only). On Node (Vercel, local) one shared pool serves every request.
const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
const perRequest = new WeakMap<object, Db>();

const globalForDb = globalThis as unknown as { pgDb?: Db };
let shared: Db | undefined;
function current(): Db {
  if (onWorkers) {
    const { ctx, env } = getCloudflareContext();
    let d = perRequest.get(ctx);
    if (!d) {
      // Hyperdrive (Cloudflare's pooler) keeps warm connections to Supabase, so each request skips the slow
      // connect-and-login. Its local address needs no TLS; without the binding we connect directly.
      const hyperdrive = (env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE;
      d = hyperdrive
        ? drizzle(postgres(hyperdrive.connectionString, { max: 5, prepare: true, fetch_types: false, connect_timeout: 10 }), { schema })
        : connect(1);
      perRequest.set(ctx, d);
    }
    return d;
  }
  shared ??= globalForDb.pgDb ?? connect();
  if (process.env.NODE_ENV !== "production") globalForDb.pgDb = shared;
  return shared;
}

/** The database. Same API everywhere; the right connection for this request is picked on each use. */
export const db = new Proxy({} as Db, {
  get(_, prop) {
    const d = current();
    const value = Reflect.get(d, prop, d);
    return typeof value === "function" ? value.bind(d) : value;
  },
});
export { schema };
