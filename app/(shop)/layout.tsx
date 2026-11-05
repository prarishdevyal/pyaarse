import { CartProvider } from "@/components/cart-provider";
import { WishlistProvider } from "@/components/wishlist-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VerifiedNotice } from "@/components/verified-notice";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { getCurrentUser } from "@/lib/auth";
import { getCollections } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { storeContact } from "@/lib/store";
import { getContent } from "@/lib/content";
import { CLIENT_TEXT_KEYS } from "@/lib/content-defaults";
import { SiteTextProvider } from "@/components/site-text";
import { formatINR } from "@/lib/format";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [user, collections, settings, t] = await Promise.all([getCurrentUser(), getCollections(), getSettings(), getContent()]);
  const contact = storeContact(process.env, { email: settings.contactEmail, whatsapp: settings.contactWhatsapp, instagram: settings.contactInstagram });
  const wishlist = user
    ? (await db.select().from(schema.wishlistItems).where(eq(schema.wishlistItems.userId, user.id))).map((w) => w.productId)
    : [];

  return (
    <SiteTextProvider texts={Object.fromEntries(CLIENT_TEXT_KEYS.map((k) => [k, t(k)]))}>
    <CartProvider>
      <WishlistProvider loggedIn={!!user} serverIds={wishlist}>
        <SiteHeader
          loggedIn={!!user}
          announcement={t("announcement").replaceAll("{threshold}", formatINR(settings.freeShippingThreshold))}
          collections={collections.map((c) => ({ name: c.name, slug: c.slug }))}
        />
        <Suspense>
          <VerifiedNotice />
        </Suspense>
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter tagline={t("footer.tagline")} contact={contact} />
        <Analytics />
      </WishlistProvider>
    </CartProvider>
    </SiteTextProvider>
  );
}
