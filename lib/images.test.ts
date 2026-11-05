import { describe, expect, it } from "vitest";
import { detectImageType, isAllowedImageUrl, storedImageName } from "./images";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("detectImageType", () => {
  it("recognises jpeg, png and webp by content", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toBe("image/webp");
  });
  it("rejects anything else, whatever its name claims", () => {
    expect(detectImageType(bytes(...ascii("<svg onload=alert(1)>")))).toBeNull();
    expect(detectImageType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    expect(detectImageType(bytes())).toBeNull();
  });
});

describe("isAllowedImageUrl", () => {
  const sb = "https://abc.supabase.co";
  const good = `${sb}/storage/v1/object/public/product-images/0123456789abcdef01234567.webp`;
  it("allows placeholders and our bucket", () => {
    expect(isAllowedImageUrl("/placeholders/product.jpg", sb)).toBe(true);
    expect(isAllowedImageUrl(good, sb)).toBe(true);
  });
  it("rejects other hosts, buckets and odd names", () => {
    expect(isAllowedImageUrl("https://evil.example/x.jpg", sb)).toBe(false);
    expect(isAllowedImageUrl(good.replace("abc.supabase.co", "abc.supabase.co.evil.example"), sb)).toBe(false);
    expect(isAllowedImageUrl(`${sb}/storage/v1/object/public/other/0123456789abcdef01234567.jpg`, sb)).toBe(false);
    expect(isAllowedImageUrl(`${sb}/storage/v1/object/public/product-images/../x.jpg`, sb)).toBe(false);
    expect(isAllowedImageUrl("/placeholders/../.env", sb)).toBe(false);
    expect(isAllowedImageUrl(good, undefined)).toBe(false);
  });
});

describe("storedImageName", () => {
  const supa = "https://abc.supabase.co";
  it("returns the file name for our uploads only", () => {
    expect(storedImageName(`${supa}/storage/v1/object/public/product-images/0123456789abcdef01234567.webp`, supa)).toBe("0123456789abcdef01234567.webp");
    expect(storedImageName("/placeholders/product.jpg", supa)).toBeNull();
    expect(storedImageName("https://evil.example/storage/v1/object/public/product-images/0123456789abcdef01234567.webp", supa)).toBeNull();
    expect(storedImageName(`${supa}/storage/v1/object/public/product-images/../other.webp`, supa)).toBeNull();
  });
});
