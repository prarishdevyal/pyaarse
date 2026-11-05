import type { MetadataRoute } from "next";

/** Public pages search engines should index. Cart, checkout, account and admin pages are left out on purpose. */
export const STATIC_PATHS = ["/", "/shop", "/about", "/contact", "/privacy", "/terms"] as const;

export function buildSitemap(
  base: string,
  products: { slug: string; createdAt: Date }[],
  collections: { slug: string }[],
): MetadataRoute.Sitemap {
  const root = base.replace(/\/+$/, "");
  return [
    ...STATIC_PATHS.map((p) => ({
      url: `${root}${p === "/" ? "" : p}`,
      changeFrequency: p === "/" || p === "/shop" ? ("daily" as const) : ("monthly" as const),
      priority: p === "/" ? 1 : p === "/shop" ? 0.9 : 0.4,
    })),
    ...collections.map((c) => ({ url: `${root}/shop?collection=${encodeURIComponent(c.slug)}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${root}/product/${encodeURIComponent(p.slug)}`, lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
