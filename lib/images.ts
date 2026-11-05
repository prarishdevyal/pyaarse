export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ImageType = keyof typeof IMAGE_TYPES;

/** Detects the real image type from the file's first bytes (ignores the browser-supplied type). */
export function detectImageType(b: Uint8Array): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Image URLs a product/collection may reference: bundled placeholders or our own Supabase bucket. */
export function isAllowedImageUrl(url: string, supabaseUrl: string | undefined): boolean {
  if (/^\/placeholders\/[\w.-]+$/.test(url)) return true;
  if (!supabaseUrl) return false;
  const prefix = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${IMAGE_BUCKET}/`;
  return url.startsWith(prefix) && /^[a-f0-9]{24}\.(jpg|png|webp)$/.test(url.slice(prefix.length));
}

/** The storage file name behind one of our uploaded image URLs, or null for placeholders and anything else. */
export function storedImageName(url: string, supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl || !isAllowedImageUrl(url, supabaseUrl) || url.startsWith("/")) return null;
  return url.slice(url.lastIndexOf("/") + 1);
}
