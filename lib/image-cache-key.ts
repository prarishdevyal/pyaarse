/**
 * Edge-cache key for a resized photo (/_next/image), or null for any other request.
 * The output format depends on what the browser accepts, so the key includes it.
 */
export function imageCacheKey(request: Request): string | null {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.pathname !== "/_next/image" && url.pathname !== "/_next/image/") return null;
  const accept = request.headers.get("accept") ?? "";
  const format = accept.includes("image/avif") ? "avif" : accept.includes("image/webp") ? "webp" : "orig";
  url.searchParams.set("_fmt", format);
  return url.toString();
}
