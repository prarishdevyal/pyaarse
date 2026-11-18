/**
 * Resized photos (/_next/image) of our own uploads are read straight from the R2 bucket instead of being
 * downloaded from img.pyaarse.net. The download went over the internet and, when the shop was busy,
 * sometimes took longer than OpenNext's 7-second limit, so the photo failed with a 504.
 *
 * The request's url parameter is pointed at a local path (/_r2-photo/<name>), which OpenNext's image
 * handler fetches through env.ASSETS; photoAssets() answers that path from the bucket.
 */

export const PHOTO_PATH = "/_r2-photo/";
const UPLOADED_NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** The same /_next/image request with our photo's url swapped for the bucket path, or null if it isn't one of ours. */
export function photoImageRequest(request: Request, imageBaseUrl: string | undefined): Request | null {
  if (!imageBaseUrl) return null;
  const url = new URL(request.url);
  const src = url.searchParams.get("url");
  const base = `${imageBaseUrl.replace(/\/+$/, "")}/`;
  if (!src || !src.startsWith(base)) return null;
  const name = src.slice(base.length);
  if (!UPLOADED_NAME.test(name)) return null;
  url.searchParams.set("url", PHOTO_PATH + name);
  return new Request(url.toString(), request);
}

type Fetcher = { fetch(input: Request | string | URL, init?: RequestInit): Promise<Response> };
type Bucket = { get(key: string): Promise<{ body: ReadableStream } | null> };

/** env.ASSETS for the image handler: bucket paths come from R2, anything else goes to the real assets. */
export function photoAssets(assets: Fetcher | undefined, bucket: Bucket): Fetcher {
  return {
    async fetch(input, init) {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (!url.pathname.startsWith(PHOTO_PATH)) {
        if (!assets) return new Response("Not found", { status: 404 });
        return assets.fetch(input, init);
      }
      const name = url.pathname.slice(PHOTO_PATH.length);
      if (!UPLOADED_NAME.test(name)) return new Response("Not found", { status: 404 });
      const obj = await bucket.get(name);
      if (!obj) return new Response("Not found", { status: 404 });
      return new Response(obj.body, {
        headers: { "content-type": TYPES[name.split(".").pop()!], "cache-control": "public, max-age=31536000, immutable" },
      });
    },
  };
}
