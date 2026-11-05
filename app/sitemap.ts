import type { MetadataRoute } from "next";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { siteUrl } from "@/lib/hosts";
import { buildSitemap } from "@/lib/sitemap";

// Built on request so new products show up without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([
    db.select({ slug: schema.products.slug, createdAt: schema.products.createdAt }).from(schema.products).where(eq(schema.products.isActive, true)).orderBy(asc(schema.products.id)),
    db.select({ slug: schema.collections.slug }).from(schema.collections),
  ]);
  return buildSitemap(siteUrl(), products, collections);
}
