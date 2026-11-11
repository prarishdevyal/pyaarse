// One-off: copy every photo from Supabase Storage into the R2 bucket, then point the saved links at R2.
// Run: DATABASE_URL=… SUPABASE_URL=… npx tsx scripts/move-images-to-r2.mts
// Safe to re-run: files are copied again under the same name, and links already on R2 are left alone.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { clientOptions } from "../lib/db/options";
import { IMAGE_BUCKET, movedImageUrl } from "../lib/images";

const { DATABASE_URL, SUPABASE_URL } = process.env;
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || "https://img.pyaarse.net";
const R2_BUCKET = "pyaarse-images";
if (!DATABASE_URL || !SUPABASE_URL) throw new Error("Set DATABASE_URL and SUPABASE_URL");
const env = { SUPABASE_URL, IMAGE_BASE_URL };

const sql = postgres(DATABASE_URL, { ...clientOptions(DATABASE_URL), max: 1 });
const dir = mkdtempSync(join(tmpdir(), "pyaarse-photos-"));
try {
  const files = await sql<{ name: string; type: string | null }[]>`
    select name, metadata->>'mimetype' as type from storage.objects where bucket_id = ${IMAGE_BUCKET} order by name`;
  console.log(`Copying ${files.length} photos to R2…`);
  for (const f of files) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${f.name}`);
    if (!res.ok) throw new Error(`Supabase returned ${res.status} for ${f.name}. Nothing in the database was changed.`);
    const path = join(dir, "photo");
    writeFileSync(path, new Uint8Array(await res.arrayBuffer()));
    execFileSync("npx", [
      "wrangler", "r2", "object", "put", `${R2_BUCKET}/${f.name}`, "--remote", "--file", path,
      "--content-type", f.type || res.headers.get("content-type") || "image/jpeg",
      "--cache-control", "public, max-age=31536000, immutable",
    ], { stdio: "ignore" });
    console.log("  ✓", f.name);
  }

  // Every photo is in R2 now, so the links can switch over.
  await sql.begin(async (tx) => {
    for (const p of await tx<{ id: number; images: string[] }[]>`select id, images from products`) {
      const moved = p.images.map((u) => movedImageUrl(u, env));
      if (moved.some((u, i) => u !== p.images[i])) await tx`update products set images = ${tx.json(moved)} where id = ${p.id}`;
    }
    for (const c of await tx<{ id: number; image: string | null }[]>`select id, image from collections where image is not null`) {
      const moved = movedImageUrl(c.image!, env);
      if (moved !== c.image) await tx`update collections set image = ${moved} where id = ${c.id}`;
    }
    for (const s of await tx<{ key: string; value: string }[]>`select key, value from site_content where key = 'home.hero.image'`) {
      const moved = movedImageUrl(s.value, env);
      if (moved !== s.value) await tx`update site_content set value = ${moved} where key = ${s.key}`;
    }
  });
  console.log("✓ links now point at", IMAGE_BASE_URL);
} finally {
  rmSync(dir, { recursive: true, force: true });
  await sql.end();
}
