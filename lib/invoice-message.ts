import { formatINR } from "./format";

/** WhatsApp text that goes with the invoice PDF. */
export function invoiceWhatsAppText(o: { customerName: string; orderNumber: string; total: number; paid: boolean; payUrl?: string | null }): string {
  const first = o.customerName.trim().split(/\s+/)[0] || "there";
  if (o.paid) return `Hi ${first}, here is the invoice for your Pyaarse order ${o.orderNumber}. Thank you for your payment of ${formatINR(o.total)}!`;
  const intro = `Hi ${first}, thank you for your Pyaarse order ${o.orderNumber}! Here is your invoice. The amount to pay is ${formatINR(o.total)}.`;
  return o.payUrl
    ? `${intro} You can pay securely online (UPI, cards or net banking) here: ${o.payUrl}`
    : `${intro} Reply here and we'll send you the link to pay online.`;
}
