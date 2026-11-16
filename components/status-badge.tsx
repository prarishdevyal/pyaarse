import type { OrderStatus } from "@/lib/db/schema";
import { STATUS_LABELS } from "@/lib/format";

const COLORS: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900",
  paid: "bg-blush text-brand",
  cod: "bg-violet-100 text-violet-900",
  shipped: "bg-sky-100 text-sky-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-stone-200 text-stone-700",
};

/** For customers, a Cash on Delivery order is simply confirmed; "to collect" is the shop's view. */
const CUSTOMER_LABELS: Partial<Record<OrderStatus, string>> = { cod: "Confirmed · pay on delivery" };

export function StatusBadge({ status, forCustomer = false }: { status: OrderStatus; forCustomer?: boolean }) {
  const label = (forCustomer && CUSTOMER_LABELS[status]) || STATUS_LABELS[status];
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${COLORS[status]}`}>{label}</span>;
}
