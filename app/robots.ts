import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/hosts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cart", "/checkout", "/account", "/wishlist", "/order-confirmed", "/login", "/register", "/forgot-password", "/reset-password", "/auth/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
