const BASE = "http://local.invalid";

/** Returns a same-origin path for post-login redirects; anything else falls back. */
export function safeNext(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Browsers treat "\" like "/" and ignore tabs/newlines, so "/\evil.com" would leave the site.
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  return url.origin === BASE ? url.pathname + url.search + url.hash : fallback;
}
