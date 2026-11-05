export function isAdminHost(host: string | null): boolean {
  return !!host && host.toLowerCase().startsWith("admin.");
}

/** Maps a request path to the internal route for the given host. null = not found. */
export function routeFor(host: string | null, pathname: string): string | null {
  if (isAdminHost(host)) {
    return pathname.startsWith("/admin") ? pathname : `/admin${pathname === "/" ? "" : pathname}`;
  }
  return pathname === "/admin" || pathname.startsWith("/admin/") ? null : pathname;
}

/** The host the browser asked for. Next.js and reverse proxies keep it in x-forwarded-host. */
export function requestHost(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0].trim();
  return forwarded || headers.get("host");
}
