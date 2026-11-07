import { formatINR } from "./format";

/** WhatsApp text that goes with the invoice PDF. */
export function invoiceWhatsAppText(o: { customerName: string; orderNumber: string; total: number; paid: boolean }): string {
  const first = o.customerName.trim().split(/\s+/)[0] || "there";
  return o.paid
    ? `Hi ${first}, here is the invoice for your Pyaarse order ${o.orderNumber}. Thank you for your payment of ${formatINR(o.total)}!`
    : `Hi ${first}, thank you for your Pyaarse order ${o.orderNumber}! Here is your invoice. The amount to pay is ${formatINR(o.total)}. Please scan the QR code below to pay.`;
}
