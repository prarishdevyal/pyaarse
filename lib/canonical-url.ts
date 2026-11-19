/**
 * Where a request should be redirected so the shop is always on https (and pyaarse.net goes to www),
 * or null if it's already fine. Vercel did this for us; Cloudflare Workers don't, so visitors from
 * links like http://pyaarse.net (e.g. Instagram) stayed on plain http, where payments can fail.
 */
const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function canonicalRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  if (LOCAL.has(url.hostname)) return null;
  let changed = false;
  if (url.protocol === "http:") {
    url.protocol = "https:";
    url.port = "";
    changed = true;
  }
  if (url.hostname === "pyaarse.net") {
    url.hostname = "www.pyaarse.net";
    changed = true;
  }
  return changed ? url.toString() : null;
}
