import type { OrderStatus } from "./db/schema";

/** Delhivery's public tracking page for a waybill. */
export const delhiveryTrackingUrl = (awb: string) => `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;

/** Waybills are typed with spaces or dashes sometimes; store them bare. */
export const normalizeAwb = (raw: string) => raw.replace(/[\s-]/g, "").toUpperCase();
export const isValidAwb = (awb: string) => /^[A-Z0-9]{6,30}$/.test(awb);

export type TrackStep = { key: "placed" | "paid" | "shipped" | "delivered"; label: string; done: boolean; current: boolean };

/** The progress bar for an order. Cancelled orders have no steps. */
export function trackSteps(status: OrderStatus): TrackStep[] {
  const order = ["placed", "paid", "shipped", "delivered"] as const;
  const labels = { placed: "Order placed", paid: "Payment received", shipped: "Shipped", delivered: "Delivered" };
  const reached = { pending_payment: 0, paid: 1, shipped: 2, delivered: 3, cancelled: -1 }[status];
  return order.map((key, i) => ({ key, label: labels[key], done: i <= reached, current: i === reached }));
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
