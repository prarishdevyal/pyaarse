import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getStockRows } from "@/lib/stock-data";
import { filterStock, isStockFilter, LOW_STOCK, STOCK_LABEL, stockStatus, stockSummary, type StockFilter } from "@/lib/stock";

export const metadata = { title: "Stock" };

const PILL = { out: "bg-brand text-ivory", low: "bg-amber-100 text-amber-900", ok: "bg-emerald-100 text-emerald-900" };
const FILTERS: { key: StockFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: `Low (${LOW_STOCK} or fewer)` },
  { key: "out", label: "Out of stock" },
];

export default async function AdminStockPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin();
  const [{ show }, all] = await Promise.all([searchParams, getStockRows()]);
  const filter: StockFilter = isStockFilter(show) ? show : "all";
  const rows = filterStock(all, filter);
  const sum = stockSummary(all);

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-taupe hover:text-brand">← Dashboard</Link>
      <div>
        <h1 className="font-serif text-4xl text-brand">Stock</h1>
        <p className="mt-1 text-sm text-taupe">
          {sum.units} units across {sum.options} options in the shop · {sum.low} low · {sum.out} out of stock. Change stock by editing the product.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/stock" : `/stock?show=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${filter === f.key ? "border-brand bg-brand text-ivory" : "border-sand hover:border-brand"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-taupe">{filter === "out" ? "Nothing is out of stock." : filter === "low" ? "Nothing is running low." : "No products yet."}</p>
      ) : (
        <div className="card overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-sand/60 text-left text-taupe">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Units left</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">In unpaid orders</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/40">
              {rows.map((r) => {
                const st = stockStatus(r.stock);
                return (
                  <tr key={r.variantId}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-taupe">{r.option}{!r.visible && " · Hidden from shop"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-medium tabular-nums">{r.stock}</td>
                    <td className="px-4 py-3"><span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${PILL[st]}`}>{STOCK_LABEL[st]}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums text-taupe">{r.held || "—"}</td>
                    <td className="px-4 py-3 text-right"><Link href={`/products/${r.productId}`} className="text-brand underline underline-offset-4">Edit</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-taupe">“In unpaid orders” are units already taken out of stock for orders waiting for payment. They come back if those orders are cancelled or expire.</p>
    </div>
  );
}
