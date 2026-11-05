import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildInvoicePdf, invoiceNumber, pdfMoney, pdfSafe, wrapText } from "./invoice";

const data = {
  orderNumber: "PY1042", customerName: "Asha Rao", email: "asha@example.com", phone: "9876543210",
  addressLine: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001", notes: "",
  subtotal: 998, shipping: 0, total: 998,
  items: [{ productName: "Rose Candle", variantName: "200g", unitPrice: 499, quantity: 2 }],
  invoiceDate: new Date("2026-11-05T10:00:00Z"),
  store: { email: "info@pyaarse.net", whatsapp: "919876543210", website: "www.pyaarse.net" },
};

describe("invoice helpers", () => {
  it("numbers invoices after the order", () => expect(invoiceNumber("PY1042")).toBe("INV-PY1042"));
  it("writes rupees without the ₹ glyph", () => expect(pdfMoney(12499)).toBe("Rs. 12,499"));
  it("replaces characters the PDF font can't draw", () => {
    expect(pdfSafe("Rose — “Love” × 2 🕯️")).toBe('Rose - "Love" x 2 ??');
    expect(pdfSafe("आशा")).toBe("???");
    expect(pdfSafe("Café")).toBe("Café");
  });
  it("wraps long text by width", () => {
    expect(wrapText("aa bb cc dd", 5, (s) => s.length)).toEqual(["aa bb", "cc dd"]);
    expect(wrapText("averyverylongword x", 5, (s) => s.length)).toEqual(["averyverylongword", "x"]);
  });
});

describe("buildInvoicePdf", () => {
  it("builds a valid PDF", async () => {
    const bytes = await buildInvoicePdf(data);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("Pyaarse invoice INV-PY1042");
  });
  it("does not crash on names in other scripts or emoji", async () => {
    const bytes = await buildInvoicePdf({ ...data, customerName: "आशा 🕯️", addressLine: "१२ रोड" });
    expect(bytes.length).toBeGreaterThan(1000);
  });
  it("continues onto a new page for long orders", async () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ productName: `Candle ${i}`, variantName: "200g", unitPrice: 499, quantity: 1 }));
    const doc = await PDFDocument.load(await buildInvoicePdf({ ...data, items }));
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
