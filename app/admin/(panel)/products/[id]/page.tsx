import Link from "next/link";
import { fromStoredPrices } from "@/lib/discounts";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCollections } from "@/lib/catalog";
import { AdminProductForm } from "@/components/admin-product-form";
import { deleteProduct } from "../../../actions";
import { ConfirmSubmit } from "@/components/confirm-submit";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [product, variants, collections] = await Promise.all([
    db.query.products.findFirst({ where: eq(schema.products.id, id) }),
    db.select().from(schema.productVariants).where(eq(schema.productVariants.productId, id)).orderBy(asc(schema.productVariants.sortOrder)),
    getCollections(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Link href="/products" className="text-sm text-taupe hover:text-brand">← Products</Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl text-brand">{product.name}</h1>
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={product.id} />
          <ConfirmSubmit label="Delete product" confirmLabel="Yes, delete permanently" />
        </form>
      </div>
      <AdminProductForm
        collections={collections}
        initial={{ ...product, variants: variants.map((v) => {
          const { regular, sale } = fromStoredPrices(v);
          return {
            id: v.id, name: v.name, price: regular, salePrice: sale, stock: v.stock,
            weightGrams: v.weightGrams, lengthCm: v.lengthCm, widthCm: v.widthCm, heightCm: v.heightCm,
          };
        }) }}
      />
    </div>
  );
}
