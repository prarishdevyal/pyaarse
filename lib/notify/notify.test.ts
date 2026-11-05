import { describe, expect, it } from "vitest";
import { buildContactTelegramMessage, buildTelegramMessage } from "./telegram";
import { buildConfirmationEmail, emailProvider } from "./email";
import type { OrderSummary } from "./types";

const order: OrderSummary = {
  orderNumber: "PY1042", customerName: "Asha <b>", email: "asha@example.com", phone: "9876543210",
  addressLine: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001", notes: "Gift wrap please",
  subtotal: 998, shipping: 79, total: 1077,
  items: [{ productName: "Rose Candle", variantName: "200g", unitPrice: 499, quantity: 2 }],
};

describe("buildTelegramMessage", () => {
  const msg = buildTelegramMessage(order, "https://admin.pyaarse.net/orders/1");
  it("includes order details", () => {
    expect(msg).toContain("PY1042");
    expect(msg).toContain("Rose Candle (200g) × 2 — ₹998");
    expect(msg).toContain("Total: ₹1,077");
    expect(msg).toContain("Gift wrap please");
  });
  it("links to WhatsApp and admin", () => {
    expect(msg).toContain("https://wa.me/919876543210");
    expect(msg).toContain("https://admin.pyaarse.net/orders/1");
  });
  it("escapes HTML in customer input", () => {
    expect(msg).toContain("Asha &lt;b&gt;");
    expect(msg).not.toContain("Asha <b>");
  });
  it("escapes quotes too", () => {
    expect(buildTelegramMessage({ ...order, customerName: 'a"b' })).toContain("a&quot;b");
  });
  it("shows free shipping", () => expect(buildTelegramMessage({ ...order, shipping: 0 })).toContain("Shipping: Free"));
});

describe("buildConfirmationEmail", () => {
  const e = buildConfirmationEmail(order);
  it("has subject with order number", () => expect(e.subject).toContain("PY1042"));
  it("mentions WhatsApp payment step", () => expect(e.text).toContain("WhatsApp at 9876543210"));
  it("escapes HTML", () => expect(e.html).toContain("Asha &lt;b&gt;"));
});

describe("emailProvider", () => {
  it("prefers Resend, then SMTP, else none", () => {
    expect(emailProvider({ RESEND_API_KEY: "re_x", SMTP_HOST: "mailpit" })).toBe("resend");
    expect(emailProvider({ SMTP_HOST: "mailpit" })).toBe("smtp");
    expect(emailProvider({})).toBe("none");
  });
});

describe("buildContactTelegramMessage", () => {
  it("escapes the message and includes contact details", () => {
    const msg = buildContactTelegramMessage({ name: "Asha", email: "a@b.co", phone: "9876543210", message: "<b>hi</b> & bye" }, "https://admin.x/messages");
    expect(msg).toContain("&lt;b&gt;hi&lt;/b&gt; &amp; bye");
    expect(msg).toContain("a@b.co · 9876543210");
    expect(msg).toContain("https://admin.x/messages");
  });
});
