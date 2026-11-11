import { describe, expect, it } from "vitest";
import { imageCacheKey } from "./image-cache-key";

const img = "https://www.pyaarse.net/_next/image?url=https%3A%2F%2Fimg.pyaarse.net%2Fa.jpg&w=640&q=75";
const req = (url: string, accept?: string, method = "GET") => new Request(url, { method, headers: accept ? { accept } : {} });

describe("imageCacheKey", () => {
  it("keys resized photos by URL and output format", () => {
    expect(imageCacheKey(req(img, "image/avif,image/webp,*/*"))).toBe(`${img}&_fmt=avif`);
    expect(imageCacheKey(req(img, "image/webp,*/*"))).toBe(`${img}&_fmt=webp`);
    expect(imageCacheKey(req(img))).toBe(`${img}&_fmt=orig`);
  });
  it("skips everything else", () => {
    expect(imageCacheKey(req("https://www.pyaarse.net/shop"))).toBeNull();
    expect(imageCacheKey(req("https://www.pyaarse.net/_next/static/x.js"))).toBeNull();
    expect(imageCacheKey(req(img, undefined, "POST"))).toBeNull();
  });
});
