import { describe, expect, it } from "vitest";
import { buildContactTelegramMessage, buildTelegramMessage } from "./telegram";
import { buildShippedEmail, buildPasswordResetEmail, buildAdminAddedEmail, buildAdminInviteEmail, buildAdminOrderEmail, buildConfirmationEmail, buildInvoiceEmail, emailProvider, mailFrom, orderAlertEmail, smtpOptions } from "./email";
import type { OrderSummary } from "./types";

const order: OrderSummary = {
  orderNumber: "PY1042", customerName: "Asha <b>", email: "asha@example.com", phone: "9876543210",
  addressLine: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001", notes: "Gift wrap please",
  subtotal: 998, discount: 0, couponCode: null, shipping: 79, total: 1077,
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
  it("links to online payment when it's on", () => {
    const pay = buildConfirmationEmail(order, undefined, "https://www.pyaarse.net/order-confirmed?n=PY1042&t=abc");
    expect(pay.text).toContain("securely online (UPI, cards, net banking)");
    expect(pay.text).toContain("https://www.pyaarse.net/order-confirmed?n=PY1042&t=abc");
    expect(pay.html).toContain('href="https://www.pyaarse.net/order-confirmed?n=PY1042&amp;t=abc"');
    expect(pay.text).not.toContain("QR code");
  });
});

describe("emailProvider", () => {
  it("prefers SMTP, then Resend, else none", () => {
    expect(emailProvider({ RESEND_API_KEY: "re_x", SMTP_HOST: "smtp.gmail.com" })).toBe("smtp");
    expect(emailProvider({ RESEND_API_KEY: "re_x" })).toBe("resend");
    expect(emailProvider({})).toBe("none");
  });
});

describe("mailFrom", () => {
  it("uses MAIL_FROM, else sends as the SMTP account", () => {
    expect(mailFrom({ MAIL_FROM: "Pyaarse <hi@pyaarse.net>", SMTP_HOST: "h", SMTP_USER: "a@gmail.com" })).toBe("Pyaarse <hi@pyaarse.net>");
    expect(mailFrom({ SMTP_HOST: "smtp.gmail.com", SMTP_USER: "pyaarse@gmail.com" })).toBe("Pyaarse <pyaarse@gmail.com>");
    expect(mailFrom({})).toBe("Pyaarse <orders@pyaarse.net>");
  });
});

describe("smtpOptions", () => {
  it("uses TLS on 465, STARTTLS port 587 by default, and times out", () => {
    expect(smtpOptions({ SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "465" })).toMatchObject({ port: 465, secure: true });
    expect(smtpOptions({ SMTP_HOST: "h", SMTP_PORT: "" })).toMatchObject({ port: 587, secure: false, auth: undefined });
    expect(smtpOptions({ SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASS: "p" }).auth).toEqual({ user: "u", pass: "p" });
    expect(smtpOptions({ SMTP_HOST: "h" })).toMatchObject({ connectionTimeout: 10_000, socketTimeout: 15_000 });
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

describe("buildAdminOrderEmail", () => {
  const e = buildAdminOrderEmail(order, "https://admin.pyaarse.net/orders/42");
  it("has the order, customer and links like the Telegram alert", () => {
    expect(e.subject).toBe("New order PY1042: ₹1,077 from Asha <b>");
    expect(e.text).toContain("Rose Candle (200g) x 2: ₹998");
    expect(e.text).toContain("https://wa.me/919876543210");
    expect(e.html).toContain("https://admin.pyaarse.net/orders/42");
    expect(e.html).toContain("Gift wrap please");
  });
  it("escapes customer input in the HTML", () => {
    expect(e.html).toContain("Asha &lt;b&gt;");
    expect(e.html).not.toContain("Asha <b>");
  });
});

describe("buildInvoiceEmail", () => {
  it("confirms payment and names the attached invoice", () => {
    const e = buildInvoiceEmail(order, "INV-PY1042");
    expect(e.subject).toContain("INV-PY1042");
    expect(e.text).toContain("received your payment for order PY1042");
    expect(e.html).toContain("Total paid");
    expect(e.html).not.toContain("Asha <b>");
  });
});

describe("orderAlertEmail", () => {
  it("uses ORDER_ALERT_EMAIL, else the SMTP mailbox, else nothing", () => {
    expect(orderAlertEmail({ ORDER_ALERT_EMAIL: "owner@x.in", SMTP_USER: "info@pyaarse.net" })).toBe("owner@x.in");
    expect(orderAlertEmail({ SMTP_USER: "info@pyaarse.net" })).toBe("info@pyaarse.net");
    expect(orderAlertEmail({ SMTP_USER: "apikey" })).toBeUndefined();
    expect(orderAlertEmail({})).toBeUndefined();
  });
});

describe("admin invite emails", () => {
  it("links to set a password and escapes the inviter", () => {
    const e = buildAdminInviteEmail("https://admin.pyaarse.net/set-password?token_hash=abc&type=invite", "<x>@pyaarse.net");
    expect(e.text).toContain("https://admin.pyaarse.net/set-password?token_hash=abc&type=invite");
    expect(e.html).toContain("token_hash=abc&amp;type=invite");
    expect(e.html).toContain("&lt;x&gt;@pyaarse.net");
  });
  it("tells existing accounts where to log in", () => {
    const e = buildAdminAddedEmail("https://admin.pyaarse.net/login", "info@pyaarse.net");
    expect(e.subject).toContain("admin");
    expect(e.text).toContain("https://admin.pyaarse.net/login");
  });
});

describe("discounts in notifications", () => {
  const discounted = { ...order, discount: 100, couponCode: "DIWALI10", total: 977 };
  it("shows the coupon and amount off in emails and Telegram", () => {
    expect(buildConfirmationEmail(discounted).text).toContain("Discount (DIWALI10): -₹100");
    expect(buildConfirmationEmail(discounted).html).toContain("−₹100");
    expect(buildAdminOrderEmail(discounted).text).toContain("Discount (DIWALI10): -₹100");
    expect(buildTelegramMessage(discounted)).toContain("Discount (DIWALI10): -₹100");
  });
  it("leaves the line out when there's no discount", () => {
    expect(buildConfirmationEmail(order).text).not.toContain("Discount");
    expect(buildTelegramMessage(order)).not.toContain("Discount");
  });
});

describe("buildPasswordResetEmail", () => {
  it("links to the reset page and reassures people who didn't ask", () => {
    const e = buildPasswordResetEmail("https://www.pyaarse.net/reset-password?token_hash=abc&type=recovery");
    expect(e.subject).toBe("Reset your Pyaarse password");
    expect(e.text).toContain("https://www.pyaarse.net/reset-password?token_hash=abc&type=recovery");
    expect(e.html).toContain("token_hash=abc&amp;type=recovery");
    expect(e.text).toContain("ignore this email");
    expect(buildPasswordResetEmail("https://admin.pyaarse.net/set-password", true).subject).toBe("Reset your Pyaarse admin password");
  });
});

describe("tracking emails", () => {
  it("adds a track link to the order confirmation when given", () => {
    expect(buildConfirmationEmail(order, "https://www.pyaarse.net/track?n=PY1042").text).toContain("Track your order any time: https://www.pyaarse.net/track?n=PY1042");
    expect(buildConfirmationEmail(order).text).not.toContain("Track your order");
  });
  it("tells the customer the order shipped, with the AWB and both links", () => {
    const e = buildShippedEmail(order, "1234567890123", "https://www.delhivery.com/track-v2/package/1234567890123", "https://www.pyaarse.net/track?n=PY1042");
    expect(e.subject).toBe("Your Pyaarse order PY1042 is on its way");
    expect(e.text).toContain("Tracking number (AWB): 1234567890123");
    expect(e.html).toContain("https://www.delhivery.com/track-v2/package/1234567890123");
    expect(e.html).toContain("Asha &lt;b&gt;");
  });
});
