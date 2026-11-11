export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ImageType = keyof typeof IMAGE_TYPES;

/** Where uploaded photos are served from: the R2 bucket's domain, plus the old Supabase bucket for links not yet moved. */
export type ImageEnv = { IMAGE_BASE_URL?: string; SUPABASE_URL?: string; [name: string]: string | undefined };

const UPLOADED_NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

/** Detects the real image type from the file's first bytes (ignores the browser-supplied type). */
export function detectImageType(b: Uint8Array): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** URL prefixes (ending in "/") our uploaded photos live under: R2 first, then the old Supabase bucket. */
export function imagePrefixes(env: ImageEnv = process.env): string[] {
  const out: string[] = [];
  if (env.IMAGE_BASE_URL) out.push(`${env.IMAGE_BASE_URL.replace(/\/+$/, "")}/`);
  if (env.SUPABASE_URL) out.push(`${env.SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${IMAGE_BUCKET}/`);
  return out;
}

/** Public URL for a file stored in the R2 bucket. */
export function imageUrl(name: string, env: ImageEnv = process.env): string {
  if (!env.IMAGE_BASE_URL) throw new Error("IMAGE_BASE_URL is not set.");
  return `${env.IMAGE_BASE_URL.replace(/\/+$/, "")}/${name}`;
}

/** Image URLs a product/collection may reference: bundled placeholders or our own uploads. */
export function isAllowedImageUrl(url: string, env: ImageEnv = process.env): boolean {
  if (/^\/placeholders\/[\w.-]+$/.test(url)) return true;
  return imagePrefixes(env).some((p) => url.startsWith(p) && UPLOADED_NAME.test(url.slice(p.length)));
}

/** The storage file name behind one of our uploaded image URLs, or null for placeholders and anything else. */
export function storedImageName(url: string, env: ImageEnv = process.env): string | null {
  if (url.startsWith("/") || !isAllowedImageUrl(url, env)) return null;
  return url.slice(url.lastIndexOf("/") + 1);
}

/** Points an old Supabase Storage link at the same file in R2; anything else is returned unchanged. */
export function movedImageUrl(url: string, env: ImageEnv): string {
  const [r2, supa] = imagePrefixes(env);
  if (!env.IMAGE_BASE_URL || !supa || !url.startsWith(supa)) return url;
  const name = url.slice(supa.length);
  return UPLOADED_NAME.test(name) ? `${r2}${name}` : url;
}
