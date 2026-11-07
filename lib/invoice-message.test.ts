import { describe, expect, it } from "vitest";
import { invoiceWhatsAppText } from "./invoice-message";

describe("invoiceWhatsAppText", () => {
  it("asks for payment with the amount before the order is paid", () => {
    const t = invoiceWhatsAppText({ customerName: "Asha Rao", orderNumber: "PY1006", total: 1376, paid: false });
    expect(t).toBe("Hi Asha, thank you for your Pyaarse order PY1006! Here is your invoice. The amount to pay is ₹1,376. Reply here and we'll send you the link to pay online.");
  });
  it("thanks the customer once paid", () => {
    expect(invoiceWhatsAppText({ customerName: "Asha", orderNumber: "PY1006", total: 1376, paid: true })).toContain("Thank you for your payment of ₹1,376");
  });
  it("sends the online pay link instead of the QR note when there is one", () => {
    const t = invoiceWhatsAppText({ customerName: "Asha", orderNumber: "PY1006", total: 1376, paid: false, payUrl: "https://www.pyaarse.net/order-confirmed?n=PY1006&t=x" });
    expect(t).toContain("pay securely online (UPI, cards or net banking) here: https://www.pyaarse.net/order-confirmed?n=PY1006&t=x");
    expect(t).not.toContain("QR");
  });
});
