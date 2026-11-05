import "server-only";
import { randomBytes } from "node:crypto";
import { detectImageType, IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES } from "./images";
import { supabaseAdmin } from "./supabase/admin";

/** Uploads a product/collection image to Supabase Storage and returns its public URL. */
export async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Each image must be under 5MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new Error("Only JPG, PNG or WebP images are allowed.");
  const name = `${randomBytes(12).toString("hex")}.${IMAGE_TYPES[type]}`;
  const storage = supabaseAdmin().storage.from(IMAGE_BUCKET);
  const { error } = await storage.upload(name, bytes, { contentType: type, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return storage.getPublicUrl(name).data.publicUrl;
}
