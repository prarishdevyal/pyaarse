import { ORDER_STATUSES, type OrderStatus } from "./db/schema";

export function isOrderStatus(s: unknown): s is OrderStatus {
  return typeof s === "string" && (ORDER_STATUSES as readonly string[]).includes(s);
}

/** Cancelled is final (its stock has been returned). Everything else can move freely so mistakes can be fixed. */
export function canChangeStatus(from: OrderStatus, to: OrderStatus): boolean {
  return from !== to && from !== "cancelled";
}

export const shouldRestock = (from: OrderStatus, to: OrderStatus) => to === "cancelled" && from !== "cancelled";
