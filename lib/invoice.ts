import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { OrderSummary } from "./notify/types";
import { STORE_TIME_ZONE } from "./format";

export type InvoiceData = OrderSummary & {
  invoiceDate: Date;
  paid: boolean;
  store: { email: string; whatsapp: string; website: string };
};

/** Wording for a paid invoice vs. one the admin sends before payment. */
export function invoiceLabels(paid: boolean) {
  if (paid) return { status: "Paid", total: "Total paid", note: "" };
  const note = "Please pay online (UPI, cards or net banking) using your payment link. Your order is prepared once payment is received.";
  return { status: "Payment due", total: "Amount to pay", note };
}

export const invoiceNumber = (orderNumber: string) => `INV-${orderNumber}`;

/** Rupees for the PDF: the built-in PDF fonts have no ₹ glyph. */
export const pdfMoney = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

/** The built-in PDF fonts only cover Latin-1; anything else (emoji, Devanagari…) would crash the PDF. */
export function pdfSafe(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7e\xa0-\xff]/gu, "?")
    .trim();
}

/** Splits text into lines no wider than maxWidth for the given measure function. */
export function wrapText(text: string, maxWidth: number, width: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (width(next) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const BRAND = rgb(0x89 / 255, 0x21 / 255, 0x1e / 255);
const INK = rgb(0x29 / 255, 0x29 / 255, 0x2a / 255);
const MUTED = rgb(0x8b / 255, 0x81 / 255, 0x7a / 255);
const LINE = rgb(0xd8 / 255, 0xc6 / 255, 0xb8 / 255);

/** A one-page A4 invoice (continues on new pages for long orders). */
export async function buildInvoicePdf(d: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Pyaarse invoice ${invoiceNumber(d.orderNumber)}`);
  pdf.setAuthor("Pyaarse");
  const labels = invoiceLabels(d.paid);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const W = 595.28, H = 841.89, M = 48;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const text = (s: string, x: number, opts: { font?: PDFFont; size?: number; color?: typeof INK; right?: boolean } = {}) => {
    const font = opts.font ?? regular, size = opts.size ?? 10, str = pdfSafe(s);
    const dx = opts.right ? x - font.widthOfTextAtSize(str, size) : x;
    page.drawText(str, { x: dx, y, size, font, color: opts.color ?? INK });
  };
  const rule = () => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: LINE });
  const ensure = (space: number) => {
    if (y - space > M) return;
    page = pdf.addPage([W, H]);
    y = H - M;
  };

  text("Pyaarse", M, { font: serif, size: 30, color: BRAND });
  text("INVOICE", W - M, { font: bold, size: 18, color: BRAND, right: true });
  y -= 18;
  text("Handcrafted candles", M, { size: 9, color: MUTED });
  text(invoiceNumber(d.orderNumber), W - M, { size: 10, right: true });
  y -= 13;
  text([d.store.website, d.store.email, d.store.whatsapp && `WhatsApp +${d.store.whatsapp}`].filter(Boolean).join("  |  "), M, { size: 9, color: MUTED });
  text(`Date: ${d.invoiceDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: STORE_TIME_ZONE })}`, W - M, { size: 10, right: true });
  y -= 13;
  text(`Order: ${d.orderNumber}`, W - M, { size: 10, right: true });
  y -= 26;
  rule();
  y -= 22;

  text("BILL TO / SHIP TO", M, { font: bold, size: 9, color: MUTED });
  text("PAYMENT", W - M, { font: bold, size: 9, color: MUTED, right: true });
  y -= 15;
  text(d.customerName, M, { font: bold, size: 11 });
  text(labels.status, W - M, { font: bold, size: 11, color: BRAND, right: true });
  y -= 14;
  for (const l of wrapText(pdfSafe(`${d.addressLine}, ${d.city}, ${d.state} - ${d.pincode}`), 300, (s) => regular.widthOfTextAtSize(s, 10))) {
    text(l, M);
    y -= 13;
  }
  text(`${d.phone}  |  ${d.email}`, M, { color: MUTED });
  y -= 30;

  const cQty = W - M - 170, cPrice = W - M - 90, cAmt = W - M;
  const header = () => {
    text("ITEM", M, { font: bold, size: 9, color: MUTED });
    text("QTY", cQty, { font: bold, size: 9, color: MUTED, right: true });
    text("PRICE", cPrice, { font: bold, size: 9, color: MUTED, right: true });
    text("AMOUNT", cAmt, { font: bold, size: 9, color: MUTED, right: true });
    y -= 8;
    rule();
    y -= 16;
  };
  header();
  for (const i of d.items) {
    const name = wrapText(pdfSafe(`${i.productName} (${i.variantName})`), cQty - M - 40, (s) => regular.widthOfTextAtSize(s, 10));
    ensure(14 * name.length + 10);
    text(String(i.quantity), cQty, { right: true });
    text(pdfMoney(i.unitPrice), cPrice, { right: true });
    text(pdfMoney(i.unitPrice * i.quantity), cAmt, { right: true });
    for (const l of name) {
      text(l, M);
      y -= 14;
    }
    y -= 4;
  }
  rule();
  y -= 18;

  ensure(80);
  const total = (label: string, value: string, strong = false) => {
    text(label, cPrice, { font: strong ? bold : regular, size: strong ? 12 : 10, right: true });
    text(value, cAmt, { font: strong ? bold : regular, size: strong ? 12 : 10, color: strong ? BRAND : INK, right: true });
    y -= strong ? 20 : 15;
  };
  total("Subtotal", pdfMoney(d.subtotal));
  if (d.discount > 0) total(`Discount${d.couponCode ? ` (${d.couponCode})` : ""}`, `- ${pdfMoney(d.discount)}`);
  total("Shipping", d.shipping === 0 ? "Free" : pdfMoney(d.shipping));
  y -= 4;
  total(labels.total, pdfMoney(d.total), true);
  if (labels.note) {
    y -= 10;
    ensure(40);
    for (const l of wrapText(labels.note, W - 2 * M, (s) => regular.widthOfTextAtSize(s, 10))) {
      text(l, M, { color: BRAND });
      y -= 13;
    }
  }

  y -= 30;
  ensure(40);
  text("Thank you for shopping with Pyaarse. Made with love, Prarish Devyal.", M, { font: serif, size: 12, color: BRAND });
  y -= 15;
  text("This is a computer-generated invoice and does not need a signature.", M, { size: 8, color: MUTED });

  return pdf.save();
}
