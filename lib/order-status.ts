import { ORDER_STATUSES, type OrderStatus } from "./db/schema";
import type { PaymentMethod } from "./shipping";

export function isOrderStatus(s: unknown): s is OrderStatus {
  return typeof s === "string" && (ORDER_STATUSES as readonly string[]).includes(s);
}

/** Statuses that only make sense for one way of paying: online orders wait for payment; COD orders are "to collect". */
const ONLY_FOR: Partial<Record<OrderStatus, PaymentMethod>> = { pending_payment: "online", paid: "online", cod: "cod" };

/** The statuses an order paid this way can have. */
export const statusesFor = (method: PaymentMethod) => ORDER_STATUSES.filter((s) => (ONLY_FOR[s] ?? method) === method);

/** Cancelled is final (its stock has been returned). Everything else can move freely so mistakes can be fixed. */
export function canChangeStatus(from: OrderStatus, to: OrderStatus, method: PaymentMethod = "online"): boolean {
  return from !== to && from !== "cancelled" && statusesFor(method).includes(to);
}

export const shouldRestock = (from: OrderStatus, to: OrderStatus) => to === "cancelled" && from !== "cancelled";

/** Whether the shop has the money: online orders once paid; Cash on Delivery orders once delivered. */
export function isPaid(status: OrderStatus, method: PaymentMethod): boolean {
  if (method === "cod") return status === "delivered";
  return status === "paid" || status === "shipped" || status === "delivered";
}
