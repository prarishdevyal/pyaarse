import Link from "next/link";
import { parseInline } from "@/lib/rich-text";
import { getContent } from "@/lib/content";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog";
import { AddToCart } from "./add-to-cart";
import { ProductGallery } from "@/components/product-gallery";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  return { title: product?.name ?? "Not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const [product, t] = await Promise.all([getProductBySlug((await params).slug), getContent()]);
  if (!product) notFound();

  return (
    <div className="container-page py-10">
      <nav className="mb-6 text-sm text-taupe">
        <Link href="/shop" className="hover:text-brand">Shop</Link>
        {product.collection && (
          <> / <Link href={`/shop?collection=${product.collection.slug}`} className="hover:text-brand">{product.collection.name}</Link></>
        )}
      </nav>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div>
          <h1 className="font-serif text-4xl text-brand sm:text-5xl">{product.name}</h1>
          <AddToCart
            product={{ id: product.id, name: product.name, slug: product.slug, image: product.images[0] }}
            variants={product.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock }))}
          />
          {product.description && (
            <div className="mt-10 border-t border-sand/70 pt-6">
              <h2 className="font-serif text-2xl">{t("product.about")}</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-charcoal/85">
                {parseInline(product.description).map((part, i) => (part.bold ? <strong key={i} className="font-semibold text-charcoal">{part.text}</strong> : <span key={i}>{part.text}</span>))}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

