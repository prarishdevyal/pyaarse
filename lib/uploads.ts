import "server-only";
import { randomBytes } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { detectImageType, IMAGE_TYPES, imageUrl, MAX_IMAGE_BYTES, storedImageName } from "./images";

/** The part of the R2 bucket binding we use. */
type PhotoBucket = {
  put(key: string, value: Uint8Array, options: { httpMetadata: { contentType: string; cacheControl: string } }): Promise<unknown>;
  delete(keys: string[]): Promise<void>;
};

/** The R2 bucket that holds product, collection and banner photos (binding PHOTOS in wrangler.jsonc). */
function bucket(): PhotoBucket {
  const b = (getCloudflareContext().env as { PHOTOS?: PhotoBucket }).PHOTOS;
  if (!b) throw new Error("Photo storage (R2 binding PHOTOS) is not configured.");
  return b;
}

/** Uploads a product/collection image to R2 and returns its public URL. */
export async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Each image must be under 5MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new Error("Only JPG, PNG or WebP images are allowed.");
  const name = `${randomBytes(12).toString("hex")}.${IMAGE_TYPES[type]}`;
  // Names are random and never reused, so browsers and Cloudflare may keep a copy for a year.
  await bucket().put(name, bytes, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
  return imageUrl(name);
}

/** Deletes uploaded images from R2 (placeholders and old Supabase links are skipped). Best effort. */
export async function removeImages(urls: string[]): Promise<void> {
  const names = urls.filter((u) => process.env.IMAGE_BASE_URL && u.startsWith(process.env.IMAGE_BASE_URL)).map((u) => storedImageName(u)).filter((n): n is string => !!n);
  if (names.length === 0) return;
  try {
    await bucket().delete(names);
  } catch (e) {
    console.error("[images] could not remove", names.length, "files:", (e as Error).message);
  }
}
