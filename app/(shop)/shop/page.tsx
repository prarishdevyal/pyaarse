import Link from "next/link";
import { getCollections, getProductCards } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { SearchIcon } from "@/components/icons";

export const metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ collection?: string; q?: string }> }) {
  const { collection, q } = await searchParams;
  const [collections, products] = await Promise.all([
    getCollections(),
    getProductCards({ collectionSlug: collection, q: q?.trim() || undefined }),
  ]);
  const current = collections.find((c) => c.slug === collection);
  const pill = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm transition ${active ? "border-brand bg-brand text-ivory" : "border-sand hover:border-brand hover:text-brand"}`;

  return (
    <div className="container-page py-12">
      <h1 className="heading-section">{current?.name ?? "Shop All Candles"}</h1>
      <p className="mt-1 text-taupe">{current?.tagline ?? "Handcrafted candles for every mood and moment."}</p>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link href="/shop" className={pill(!collection)}>All</Link>
          {collections.map((c) => (
            <Link key={c.slug} href={`/shop?collection=${c.slug}`} className={pill(collection === c.slug)}>{c.name}</Link>
          ))}
        </div>
        <form className="relative md:w-72" action="/shop">
          {collection && <input type="hidden" name="collection" value={collection} />}
          <input name="q" defaultValue={q} placeholder="Search candles" className="input pl-10" />
          <SearchIcon width={18} height={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
        </form>
      </div>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-taupe">No candles found.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
