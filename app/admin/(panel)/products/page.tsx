import Link from "next/link";
import { variantLabel } from "@/lib/variants";
import { requireAdmin } from "@/lib/auth";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { PRODUCT_PLACEHOLDER } from "@/lib/catalog";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteProduct, setProductVisible } from "../../actions";

export const metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const { deleted } = await searchParams;
  const [products, variants] = await Promise.all([
    db.select({ p: schema.products, collection: schema.collections.name })
      .from(schema.products)
      .leftJoin(schema.collections, eq(schema.collections.id, schema.products.collectionId))
      .orderBy(desc(schema.products.createdAt)),
    db.select().from(schema.productVariants).orderBy(asc(schema.productVariants.sortOrder)),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-brand">Products</h1>
          <p className="mt-1 text-sm text-taupe">Hide takes a product off the shop but keeps it. Delete removes it and its photos for good.</p>
        </div>
        <Link href="/products/new" className="btn-primary shrink-0">+ Add product</Link>
      </div>
      {deleted && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          “{deleted}” was deleted. Past orders that included it are unchanged.
        </p>
      )}
      {products.length === 0 ? (
        <p className="py-8 text-center text-taupe">No products yet. Add your first candle!</p>
      ) : (
        <div className="card divide-y divide-sand/40 bg-white">
          {products.map(({ p, collection }) => {
            const vs = variants.filter((v) => v.productId === p.id);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:bg-blush/40">
                <Link href={`/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0] ?? PRODUCT_PLACEHOLDER} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {p.name}
                      {!p.isActive && <span className="ml-2 rounded bg-stone-200 px-2 py-0.5 text-xs text-stone-700">Hidden</span>}
                      {p.isBestseller && <span className="ml-2 rounded bg-blush px-2 py-0.5 text-xs text-brand">Bestseller</span>}
                    </p>
                    <p className="truncate text-xs text-taupe">
                      {collection ?? "No collection"} · {vs.map((v) => `${variantLabel(v.name, v.subName)} ${formatINR(v.price)} (${v.stock})`).join(" · ") || "No variants"}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-4 text-sm">
                  <Link href={`/products/${p.id}`} className="text-brand underline underline-offset-4">Edit</Link>
                  <form action={setProductVisible}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="visible" value={String(!p.isActive)} />
                    <button className="text-taupe underline underline-offset-4 hover:text-brand">{p.isActive ? "Hide" : "Show"}</button>
                  </form>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmit label="Delete" confirmLabel="Yes, delete" />
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
