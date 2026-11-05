const hostOf = (url: string | undefined) => {
  try {
    return url ? new URL(url).host.toLowerCase() : null;
  } catch {
    return null;
  }
};

/**
 * The admin lives on `admin.*`, or on the exact host in ADMIN_URL (e.g. pyaarse-admin.vercel.app,
 * since *.vercel.app can't have an admin. subdomain). ADMIN_URL is ignored if it points at the shop itself.
 */
export function isAdminHost(host: string | null, env: { ADMIN_URL?: string; SITE_URL?: string } = { ADMIN_URL: process.env.ADMIN_URL, SITE_URL: process.env.SITE_URL }): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  if (h.startsWith("admin.")) return true;
  const admin = hostOf(env.ADMIN_URL);
  return !!admin && admin === h && admin !== hostOf(env.SITE_URL);
}

/** Maps a request path to the internal route for the given host. null = not found. */
export function routeFor(host: string | null, pathname: string, env?: { ADMIN_URL?: string; SITE_URL?: string }): string | null {
  if (isAdminHost(host, env)) {
    return pathname.startsWith("/admin") ? pathname : `/admin${pathname === "/" ? "" : pathname}`;
  }
  return pathname === "/admin" || pathname.startsWith("/admin/") ? null : pathname;
}

/** The host the browser asked for. Next.js and reverse proxies keep it in x-forwarded-host. */
export function requestHost(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0].trim();
  return forwarded || headers.get("host");
}

/** Public shop URL: SITE_URL, else the Vercel production domain, else localhost. No trailing slash. */
export function siteUrl(env: { SITE_URL?: string; VERCEL_PROJECT_PRODUCTION_URL?: string } = {
    SITE_URL: process.env.SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  }): string {
  const url = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}
