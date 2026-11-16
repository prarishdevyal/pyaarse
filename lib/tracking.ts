import type { OrderStatus } from "./db/schema";
import type { PaymentMethod } from "./shipping";

/** Delhivery's public tracking page for a waybill. */
export const delhiveryTrackingUrl = (awb: string) => `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;

/** Waybills are typed with spaces or dashes sometimes; store them bare. */
export const normalizeAwb = (raw: string) => raw.replace(/[\s-]/g, "").toUpperCase();
export const isValidAwb = (awb: string) => /^[A-Z0-9]{6,30}$/.test(awb);

export type TrackStep = { key: "placed" | "paid" | "shipped" | "delivered"; label: string; done: boolean; current: boolean };

/** The progress bar for an order. Cash on Delivery orders have no payment step. Cancelled orders have no steps. */
export function trackSteps(status: OrderStatus, method: PaymentMethod = "online"): TrackStep[] {
  const labels = { placed: "Order placed", paid: "Payment received", shipped: "Shipped", delivered: "Delivered" };
  const order = method === "cod" ? (["placed", "shipped", "delivered"] as const) : (["placed", "paid", "shipped", "delivered"] as const);
  const at: Record<OrderStatus, TrackStep["key"] | null> = { pending_payment: "placed", cod: "placed", paid: "paid", shipped: "shipped", delivered: "delivered", cancelled: null };
  const reached = at[status] ? (order as readonly string[]).indexOf(at[status]!) : -1;
  return order.map((key, i) => ({ key, label: key === "delivered" && method === "cod" ? "Delivered and paid" : labels[key], done: i <= reached, current: i === reached }));
}

const digits = (s: string) => s.replace(/\D/g, "").slice(-10);

/** Guests prove it's their order with the email or phone used at checkout. */
export function contactMatches(order: { email: string; phone: string }, contact: string): boolean {
  const c = contact.trim();
  if (!c) return false;
  if (c.includes("@")) return c.toLowerCase() === order.email.toLowerCase();
  const d = digits(c);
  return d.length === 10 && d === digits(order.phone);
}

/** Only paid or Cash on Delivery orders can be shipped (or have their tracking corrected once shipped/delivered). */
export const canShip = (status: OrderStatus) => status === "paid" || status === "cod" || status === "shipped" || status === "delivered";
