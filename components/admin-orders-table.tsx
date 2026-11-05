import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { formatINR } from "@/lib/format";
import type { OrderStatus } from "@/lib/db/schema";

type Row = { id: number; orderNumber: string; customerName: string; phone: string; total: number; status: OrderStatus; createdAt: Date };

export function AdminOrdersTable({ orders }: { orders: Row[] }) {
  if (orders.length === 0) return <p className="py-8 text-center text-taupe">No orders yet.</p>;
  return (
    <div className="card overflow-x-auto bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-sand/60 text-left text-taupe">
          <tr>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-sand/30 last:border-0 hover:bg-blush/40">
              <td className="px-4 py-3"><Link href={`/orders/${o.id}`} className="font-medium text-brand hover:underline">{o.orderNumber}</Link></td>
              <td className="px-4 py-3">{o.customerName}<div className="text-xs text-taupe">{o.phone}</div></td>
              <td className="px-4 py-3 whitespace-nowrap">{o.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
              <td className="px-4 py-3">{formatINR(o.total)}</td>
              <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
