import type { OrderStatus } from "@/lib/db/schema";
import { STATUS_LABELS } from "@/lib/format";

const COLORS: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900",
  paid: "bg-blush text-brand",
  shipped: "bg-sky-100 text-sky-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-stone-200 text-stone-700",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${COLORS[status]}`}>{STATUS_LABELS[status]}</span>;
}
