/** postgres-js options for a connection URL. Serverless and the Supabase transaction pooler (port 6543) need small pools and no prepared statements. */
export function clientOptions(url: string | undefined, env: { VERCEL?: string } = {}) {
  const isLocal = !url || /@(localhost|127\.0\.0\.1|db)(:\d+)?\//.test(url);
  const transactionPooler = !!url && /:6543\//.test(url);
  return {
    max: env.VERCEL ? 1 : 10,
    ssl: isLocal ? (false as const) : ("require" as const),
    prepare: !transactionPooler,
    // Supavisor in transaction mode can lose pipelined queries, which then hang forever.
    max_pipeline: transactionPooler ? 1 : 100,
    // Fail fast instead of hanging when the pooler is saturated, and hand idle connections back.
    connect_timeout: 10,
    idle_timeout: 20,
    queue_timeout: 15,
  };
}
