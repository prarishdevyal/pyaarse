import { describe, expect, it } from "vitest";
import { invoiceWhatsAppText } from "./invoice-message";

describe("invoiceWhatsAppText", () => {
  it("asks for payment with the amount before the order is paid", () => {
    const t = invoiceWhatsAppText({ customerName: "Asha Rao", orderNumber: "PY1006", total: 1376, paid: false });
    expect(t).toBe("Hi Asha, thank you for your Pyaarse order PY1006! Here is your invoice. The amount to pay is ₹1,376. Please scan the QR code below to pay.");
  });
  it("thanks the customer once paid", () => {
    expect(invoiceWhatsAppText({ customerName: "Asha", orderNumber: "PY1006", total: 1376, paid: true })).toContain("Thank you for your payment of ₹1,376");
  });
});
