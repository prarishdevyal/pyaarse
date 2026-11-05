import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db, schema } from "./db";

const { products, productVariants, collections } = schema;

export const PRODUCT_PLACEHOLDER = "/placeholders/product.jpg";

export type ProductCard = {
  id: number;
  name: string;
  slug: string;
  image: string;
  minPrice: number | null;
  /** Regular price of the cheapest variant when it's on sale (shown crossed out), else null. */
  minPriceWas: number | null;
  inStock: boolean;
  collectionName: string | null;
};

/** Shared by the layout and the page within one request. */
export const getCollections = cache(async () =>
  db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.name)),
);

export async function getProductCards(opts: { collectionSlug?: string; bestsellers?: boolean; ids?: number[]; q?: string; limit?: number } = {}): Promise<ProductCard[]> {
  const conds = [eq(products.isActive, true)];
  if (opts.collectionSlug) conds.push(eq(collections.slug, opts.collectionSlug));
  if (opts.bestsellers) conds.push(eq(products.isBestseller, true));
  if (opts.q) conds.push(ilike(products.name, `%${opts.q.replace(/[%_\\]/g, "\\$&")}%`));
  if (opts.ids) {
    if (opts.ids.length === 0) return [];
    conds.push(inArray(products.id, opts.ids));
  }
  const q = db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      images: products.images,
      collectionName: collections.name,
      minPrice: sql<number | null>`min(${productVariants.price})`,
      minPriceWas: sql<number | null>`(array_agg(${productVariants.compareAtPrice} order by ${productVariants.price}, ${productVariants.id}))[1]`,
      totalStock: sql<number>`coalesce(sum(${productVariants.stock}), 0)`,
    })
    .from(products)
    .leftJoin(collections, eq(collections.id, products.collectionId))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(and(...conds))
    .groupBy(products.id, collections.name)
    .orderBy(desc(products.createdAt))
    .$dynamic();
  const rows = opts.limit ? await q.limit(opts.limit) : await q;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    image: r.images[0] ?? PRODUCT_PLACEHOLDER,
    minPrice: r.minPrice === null ? null : Number(r.minPrice),
    minPriceWas: r.minPriceWas !== null && r.minPrice !== null && Number(r.minPriceWas) > Number(r.minPrice) ? Number(r.minPriceWas) : null,
    inStock: Number(r.totalStock) > 0,
    collectionName: r.collectionName,
  }));
}

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.isActive, true)),
  });
  if (!product) return null;
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.id));
  const collection = product.collectionId
    ? await db.query.collections.findFirst({ where: eq(collections.id, product.collectionId) })
    : null;
  return { ...product, images: product.images.length ? product.images : [PRODUCT_PLACEHOLDER], variants, collection };
}
