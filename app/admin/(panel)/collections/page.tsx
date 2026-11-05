import { count, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getCollections } from "@/lib/catalog";
import { CollectionForm } from "./collection-form";
import { deleteCollection } from "../../actions";
import { ConfirmSubmit } from "@/components/confirm-submit";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  await requireAdmin();
  const [collections, counts] = await Promise.all([
    getCollections(),
    db.select({ id: schema.products.collectionId, n: count() }).from(schema.products).groupBy(schema.products.collectionId),
  ]);
  const countOf = (id: number) => counts.find((c) => c.id === id)?.n ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-brand">Collections</h1>
      <div className="space-y-4">
        {collections.map((c, i) => (
          <details key={c.id} className="card bg-white p-4">
            <summary className="flex cursor-pointer items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image ?? `/placeholders/collection-${(i % 4) + 1}.jpg`} alt="" className="h-12 w-16 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-taupe">{c.tagline} · {countOf(c.id)} products</p>
              </div>
              <span className="text-sm text-taupe">Edit</span>
            </summary>
            <div className="mt-4 border-t border-sand/50 pt-4">
              <CollectionForm initial={c} />
              <form action={deleteCollection} className="mt-4">
                <input type="hidden" name="id" value={c.id} />
                <ConfirmSubmit label="Delete collection" confirmLabel="Yes, delete (products are kept)" />
              </form>
            </div>
          </details>
        ))}
      </div>
      <section className="card bg-white p-5">
        <h2 className="mb-4 font-serif text-2xl">Add collection</h2>
        <CollectionForm />
      </section>
    </div>
  );
}
