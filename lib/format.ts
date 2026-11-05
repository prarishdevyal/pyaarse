import type { OrderStatus } from "./db/schema";

export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function orderNumberFor(id: number): string {
  return `PY${1000 + id}`;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Normalises an Indian mobile number to 91XXXXXXXXXX for wa.me links. */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  return digits;
}

/** The shop runs on India time; servers (Vercel) run on UTC. */
export const STORE_TIME_ZONE = "Asia/Kolkata";

export function formatDateTime(d: Date, style: "full" | "medium" = "medium"): string {
  return d.toLocaleString("en-IN", { dateStyle: style, timeStyle: "short", timeZone: STORE_TIME_ZONE });
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: STORE_TIME_ZONE });
}

const IST_OFFSET_MS = 330 * 60_000;

/** Midnight in India (as a UTC instant) for the day containing `now`. India has no daylight saving. */
export function startOfIndianDay(now: Date = new Date()): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}
