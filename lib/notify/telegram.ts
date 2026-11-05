import { formatINR, toWhatsAppNumber } from "../format";
import type { OrderSummary } from "./types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildTelegramMessage(o: OrderSummary, adminOrderUrl?: string): string {
  const items = o.items
    .map((i) => `• ${esc(i.productName)} (${esc(i.variantName)}) × ${i.quantity} — ${formatINR(i.unitPrice * i.quantity)}`)
    .join("\n");
  const wa = `https://wa.me/${toWhatsAppNumber(o.phone)}`;
  const lines = [
    `🕯️ <b>New order ${esc(o.orderNumber)}</b>`,
    `Status: Pending payment`,
    ``,
    `👤 ${esc(o.customerName)}`,
    `📞 ${esc(o.phone)}`,
    `✉️ ${esc(o.email)}`,
    `📍 ${esc(o.addressLine)}, ${esc(o.city)}, ${esc(o.state)} - ${esc(o.pincode)}`,
    ``,
    `<b>Items</b>`,
    items,
    ``,
    `Subtotal: ${formatINR(o.subtotal)}`,
    ...(o.discount > 0 ? [`Discount${o.couponCode ? ` (${esc(o.couponCode)})` : ""}: -${formatINR(o.discount)}`] : []),
    `Shipping: ${o.shipping === 0 ? "Free" : formatINR(o.shipping)}`,
    `<b>Total: ${formatINR(o.total)}</b>`,
  ];
  if (o.notes) lines.push(``, `📝 ${esc(o.notes)}`);
  lines.push(``, `<a href="${wa}">💬 Message customer on WhatsApp</a>`);
  if (adminOrderUrl) lines.push(`<a href="${adminOrderUrl}">🔗 Open in admin</a>`);
  return lines.join("\n");
}

export function buildContactTelegramMessage(m: { name: string; email: string; phone: string; message: string }, adminUrl?: string): string {
  const lines = [
    `✉️ <b>New message from ${esc(m.name)}</b>`,
    `${esc(m.email)}${m.phone ? ` · ${esc(m.phone)}` : ""}`,
    ``,
    esc(m.message),
  ];
  if (adminUrl) lines.push(``, `<a href="${adminUrl}">🔗 Open in admin</a>`);
  return lines.join("\n");
}

export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set, skipping. Message:\n" + text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram API ${res.status}: ${await res.text()}`);
}
