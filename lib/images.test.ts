import { describe, expect, it } from "vitest";
import { detectImageType, imagePrefixes, isAllowedImageUrl, movedImageUrl, storedImageName } from "./images";

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

const env = { IMAGE_BASE_URL: "https://img.example.com", SUPABASE_URL: "https://abc.supabase.co" };
const r2 = "https://img.example.com/0123456789abcdef01234567.webp";
const old = "https://abc.supabase.co/storage/v1/object/public/product-images/0123456789abcdef01234567.webp";

describe("isAllowedImageUrl", () => {
  it("allows placeholders, R2 uploads and not-yet-moved Supabase uploads", () => {
    expect(isAllowedImageUrl("/placeholders/product.jpg", env)).toBe(true);
    expect(isAllowedImageUrl(r2, env)).toBe(true);
    expect(isAllowedImageUrl(old, env)).toBe(true);
  });
  it("rejects other hosts, buckets and odd names", () => {
    expect(isAllowedImageUrl("https://evil.example/x.jpg", env)).toBe(false);
    expect(isAllowedImageUrl(r2.replace("img.example.com", "img.example.com.evil.example"), env)).toBe(false);
    expect(isAllowedImageUrl(old.replace("abc.supabase.co", "abc.supabase.co.evil.example"), env)).toBe(false);
    expect(isAllowedImageUrl("https://abc.supabase.co/storage/v1/object/public/other/0123456789abcdef01234567.jpg", env)).toBe(false);
    expect(isAllowedImageUrl("https://img.example.com/../x.jpg", env)).toBe(false);
    expect(isAllowedImageUrl("https://img.example.com/sub/0123456789abcdef01234567.jpg", env)).toBe(false);
    expect(isAllowedImageUrl("/placeholders/../.env", env)).toBe(false);
    expect(isAllowedImageUrl(r2, {})).toBe(false);
  });
});

describe("imagePrefixes", () => {
  it("lists R2 first and tolerates trailing slashes", () => {
    expect(imagePrefixes({ IMAGE_BASE_URL: "https://img.example.com/", SUPABASE_URL: "https://abc.supabase.co" })).toEqual([
      "https://img.example.com/",
      "https://abc.supabase.co/storage/v1/object/public/product-images/",
    ]);
  });
});

describe("storedImageName", () => {
  it("returns the file name for our uploads only", () => {
    expect(storedImageName(r2, env)).toBe("0123456789abcdef01234567.webp");
    expect(storedImageName(old, env)).toBe("0123456789abcdef01234567.webp");
    expect(storedImageName("/placeholders/product.jpg", env)).toBeNull();
    expect(storedImageName("https://evil.example/0123456789abcdef01234567.webp", env)).toBeNull();
  });
});

describe("movedImageUrl", () => {
  it("points old Supabase links at R2", () => {
    expect(movedImageUrl(old, env)).toBe(r2);
  });
  it("leaves everything else alone", () => {
    expect(movedImageUrl(r2, env)).toBe(r2);
    expect(movedImageUrl("/placeholders/product.jpg", env)).toBe("/placeholders/product.jpg");
    expect(movedImageUrl("https://abc.supabase.co/storage/v1/object/public/product-images/../x.jpg", env)).toBe("https://abc.supabase.co/storage/v1/object/public/product-images/../x.jpg");
    expect(movedImageUrl(old, { SUPABASE_URL: env.SUPABASE_URL })).toBe(old);
  });
});
