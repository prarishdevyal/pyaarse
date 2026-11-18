import { describe, expect, it, vi } from "vitest";
import { photoAssets, photoImageRequest } from "./photo-source";

const BASE = "https://img.pyaarse.net";
const NAME = "1a6388f2b0dd653cbf16536a.jpg";
const img = (src: string) => new Request(`https://www.pyaarse.net/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`, { headers: { accept: "image/avif,image/webp" } });

describe("photoImageRequest", () => {
  it("points our own photos at the bucket path and keeps size, quality and headers", () => {
    const r = photoImageRequest(img(`${BASE}/${NAME}`), BASE)!;
    const u = new URL(r.url);
    expect(u.searchParams.get("url")).toBe(`/_r2-photo/${NAME}`);
    expect(u.searchParams.get("w")).toBe("640");
    expect(u.searchParams.get("q")).toBe("75");
    expect(r.headers.get("accept")).toBe("image/avif,image/webp");
  });

  it("leaves other photos and odd names alone", () => {
    expect(photoImageRequest(img("https://x.supabase.co/storage/v1/object/public/a.jpg"), BASE)).toBeNull();
    expect(photoImageRequest(img(`${BASE}/../secret.jpg`), BASE)).toBeNull();
    expect(photoImageRequest(img(`${BASE}/notes.txt`), BASE)).toBeNull();
    expect(photoImageRequest(img("/placeholders/candle.jpg"), BASE)).toBeNull();
    expect(photoImageRequest(img(`${BASE}/${NAME}`), undefined)).toBeNull();
  });
});

describe("photoAssets", () => {
  const body = () => new Blob(["jpegbytes"]).stream();

  it("serves bucket paths from R2 as long-lived images", async () => {
    const get = vi.fn(async () => ({ body: body() }));
    const res = await photoAssets(undefined, { get }).fetch(`https://www.pyaarse.net/_r2-photo/${NAME}`);
    expect(get).toHaveBeenCalledWith(NAME);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(await res.text()).toBe("jpegbytes");
  });

  it("answers 404 for a missing photo or a bad name", async () => {
    const get = vi.fn(async () => null);
    expect((await photoAssets(undefined, { get }).fetch(`https://www.pyaarse.net/_r2-photo/${NAME}`)).status).toBe(404);
    expect((await photoAssets(undefined, { get }).fetch("https://www.pyaarse.net/_r2-photo/x.svg")).status).toBe(404);
  });

  it("passes everything else to the real assets", async () => {
    const assets = { fetch: vi.fn(async () => new Response("static")) };
    const res = await photoAssets(assets, { get: vi.fn() }).fetch("https://www.pyaarse.net/placeholders/candle.jpg");
    expect(await res.text()).toBe("static");
    expect(assets.fetch).toHaveBeenCalled();
  });
});
