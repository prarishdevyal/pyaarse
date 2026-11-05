import nodemailer from "nodemailer";
import { Resend } from "resend";
import { formatINR } from "../format";
import type { OrderSummary } from "./types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildConfirmationEmail(o: OrderSummary): { subject: string; text: string; html: string } {
  const subject = `Your Pyaarse order ${o.orderNumber} is confirmed`;
  const itemsText = o.items
    .map((i) => `- ${i.productName} (${i.variantName}) x ${i.quantity}: ${formatINR(i.unitPrice * i.quantity)}`)
    .join("\n");
  const address = `${o.addressLine}, ${o.city}, ${o.state} - ${o.pincode}`;
  const shippingLabel = o.shipping === 0 ? "Free" : formatINR(o.shipping);

  const text = [
    `Hi ${o.customerName},`,
    ``,
    `Thank you for your order! We've received order ${o.orderNumber}.`,
    ``,
    itemsText,
    ``,
    `Subtotal: ${formatINR(o.subtotal)}`,
    `Shipping: ${shippingLabel}`,
    `Total: ${formatINR(o.total)}`,
    ``,
    `Shipping to: ${address}`,
    ``,
    `Next step: we'll message you on WhatsApp at ${o.phone} with a payment QR code. Your order will be prepared once payment is received.`,
    ``,
    `With love,`,
    `Pyaarse`,
  ].join("\n");

  const rows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #D8C6B8">${esc(i.productName)}<br><span style="color:#8B817A;font-size:13px">${esc(i.variantName)} × ${i.quantity}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #D8C6B8;text-align:right">${formatINR(i.unitPrice * i.quantity)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#FFFDF6;font-family:Arial,sans-serif;color:#29292A">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <h1 style="font-family:Georgia,serif;font-style:italic;color:#89211E;font-weight:normal;margin:0 0 24px">Pyaarse</h1>
    <p>Hi ${esc(o.customerName)},</p>
    <p>Thank you for your order! We've received order <strong>${esc(o.orderNumber)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}
      <tr><td style="padding:8px 0">Subtotal</td><td style="padding:8px 0;text-align:right">${formatINR(o.subtotal)}</td></tr>
      <tr><td style="padding:4px 0">Shipping</td><td style="padding:4px 0;text-align:right">${shippingLabel}</td></tr>
      <tr><td style="padding:8px 0;font-weight:bold">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#89211E">${formatINR(o.total)}</td></tr>
    </table>
    <p style="color:#8B817A;font-size:14px">Shipping to: ${esc(address)}</p>
    <div style="background:#F3E7E3;border-radius:12px;padding:16px;margin:24px 0">
      <strong>Next step:</strong> we'll message you on WhatsApp at ${esc(o.phone)} with a payment QR code. Your order will be prepared once payment is received.
    </div>
    <p>With love,<br>Pyaarse</p>
  </div></body></html>`;

  return { subject, text, html };
}

export type EmailProvider = "resend" | "smtp" | "none";

/** Resend when RESEND_API_KEY is set, else SMTP (Mailpit locally), else emails are only logged. */
export function emailProvider(env: Record<string, string | undefined> = process.env): EmailProvider {
  if (env.RESEND_API_KEY) return "resend";
  if (env.SMTP_HOST) return "smtp";
  return "none";
}

const from = () => process.env.MAIL_FROM ?? "Pyaarse <orders@pyaarse.net>";
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let resend: Resend | null = null;

export async function sendEmail(to: string, msg: { subject: string; text: string; html: string }): Promise<void> {
  const provider = emailProvider();
  if (provider === "resend") {
    resend ??= new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: from(), to, ...msg });
    if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
    return;
  }
  if (provider === "smtp") {
    transporter ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transporter.sendMail({ from: from(), to, ...msg });
    return;
  }
  console.warn(`[email] no email provider configured, skipping email to ${to}: ${msg.subject}`);
}
