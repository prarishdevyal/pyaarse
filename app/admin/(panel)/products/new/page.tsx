import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getCollections } from "@/lib/catalog";
import { AdminProductForm } from "@/components/admin-product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const collections = await getCollections();
  return (
    <div className="space-y-6">
      <Link href="/products" className="text-sm text-taupe hover:text-brand">← Products</Link>
      <h1 className="font-serif text-4xl text-brand">New product</h1>
      <AdminProductForm collections={collections} />
    </div>
  );
}
