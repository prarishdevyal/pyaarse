import { describe, expect, it } from "vitest";
import { cartItemsSchema, checkoutSchema, contactSchema, couponSchema, resetPasswordSchema, settingsSchema, variantProblems } from "./validation";

const base = {
  customerName: "Asha", email: " Asha@Example.com ", phone: "98765 43210",
  addressLine: "12 MG Road, Apt 4", city: "Pune", state: "Maharashtra", pincode: "411001",
  items: [{ variantId: 1, quantity: 1 }],
};

describe("checkoutSchema", () => {
  it("accepts and normalises valid input", () => {
    const r = checkoutSchema.parse(base);
    expect(r.email).toBe("asha@example.com");
    expect(r.phone).toBe("9876543210");
    expect(r.notes).toBe("");
  });
  it("rejects bad phone", () => expect(checkoutSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false));
  it("rejects bad pincode", () => expect(checkoutSchema.safeParse({ ...base, pincode: "4110" }).success).toBe(false));
  it("rejects empty cart", () => expect(checkoutSchema.safeParse({ ...base, items: [] }).success).toBe(false));
});

describe("checkout hardening", () => {
  it("collapses newlines in single-line fields", () => {
    const r = checkoutSchema.parse({ ...base, customerName: "Asha\nTotal: ₹1", addressLine: "12 MG Road\r\n\tApt 4" });
    expect(r.customerName).toBe("Asha Total: ₹1");
    expect(r.addressLine).toBe("12 MG Road Apt 4");
  });
  it("rejects duplicate variant lines", () => {
    const items = [{ variantId: 1, quantity: 5 }, { variantId: 1, quantity: 5 }];
    expect(checkoutSchema.safeParse({ ...base, items }).success).toBe(false);
  });
  it("caps quantity per line and number of lines", () => {
    expect(checkoutSchema.safeParse({ ...base, items: [{ variantId: 1, quantity: 11 }] }).success).toBe(false);
    const many = Array.from({ length: 31 }, (_, i) => ({ variantId: i + 1, quantity: 1 }));
    expect(checkoutSchema.safeParse({ ...base, items: many }).success).toBe(false);
  });
});

describe("cartItemsSchema", () => {
  it("accepts an empty cart for quotes but rejects junk", () => {
    expect(cartItemsSchema.safeParse([]).success).toBe(true);
    expect(cartItemsSchema.safeParse("nope").success).toBe(false);
    expect(cartItemsSchema.safeParse([{ variantId: -1, quantity: 1 }]).success).toBe(false);
  });
});

describe("contactSchema", () => {
  const ok = { name: "Asha\nK", email: "Asha@Example.com", phone: "", message: "Do you make wedding favours?" };
  it("accepts a normal message and normalises fields", () => {
    const r = contactSchema.parse(ok);
    expect(r).toMatchObject({ name: "Asha K", email: "asha@example.com", phone: "", website: "" });
  });
  it("validates the optional phone number", () => {
    expect(contactSchema.parse({ ...ok, phone: "98765 43210" }).phone).toBe("9876543210");
    expect(contactSchema.safeParse({ ...ok, phone: "123" }).success).toBe(false);
  });
  it("rejects short messages and filled-in trap fields", () => {
    expect(contactSchema.safeParse({ ...ok, message: "hi" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...ok, website: "http://spam.example" }).success).toBe(false);
  });
});

describe("checkout state", () => {
  it("only accepts Indian states and union territories", () => {
    expect(checkoutSchema.safeParse({ ...base, state: "Kerala" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...base, state: "Delhi" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...base, state: "Atlantis" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, state: "" }).success).toBe(false);
  });
});

describe("admin form rules", () => {
  it("validates settings amounts", () => {
    expect(settingsSchema.safeParse({ shippingFee: "79", freeShippingThreshold: "999" }).success).toBe(true);
    expect(settingsSchema.safeParse({ shippingFee: "-5", freeShippingThreshold: "999" }).success).toBe(false);
    expect(settingsSchema.safeParse({ shippingFee: "7.5", freeShippingThreshold: "" }).success).toBe(false);
  });
  it("flags bad variant rows", () => {
    expect(variantProblems([{ name: "200g", price: 499, stock: 3 }])).toEqual({});
    expect(variantProblems([{ name: "", price: 499, stock: 3 }, { name: "x", price: 0, stock: 1 }])).toEqual({
      0: "Give this variant a name, e.g. 200g.",
      1: "Price must be at least ₹1.",
    });
    expect(variantProblems([{ name: "200g", price: 1, stock: 1 }, { name: "200G", price: 1, stock: 1 }])[1]).toBe("Two variants have the same name.");
  });
  it("checks sale prices are below the price", () => {
    expect(variantProblems([{ name: "200g", price: 699, salePrice: 499, stock: 3 }])).toEqual({});
    expect(variantProblems([{ name: "200g", price: 699, salePrice: null, stock: 3 }])).toEqual({});
    expect(variantProblems([{ name: "200g", price: 699, salePrice: 699, stock: 3 }])[0]).toBe("Sale price must be lower than the price.");
    expect(variantProblems([{ name: "200g", price: 699, salePrice: 0, stock: 3 }])[0]).toBe("Sale price must be lower than the price.");
  });
});

describe("couponSchema", () => {
  const base = { code: " diwali 10 ", kind: "percent", value: "10", minSubtotal: "", maxDiscount: "", usageLimit: "", expiresOn: "" };
  it("normalises the code and fills defaults", () => {
    expect(couponSchema.parse(base)).toEqual({ code: "DIWALI10", kind: "percent", value: 10, minSubtotal: 0, maxDiscount: null, usageLimit: null, expiresOn: "" });
  });
  it("rejects bad input", () => {
    expect(couponSchema.safeParse({ ...base, code: "a!" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...base, value: "95" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...base, kind: "flat", value: "95" }).success).toBe(true);
    expect(couponSchema.safeParse({ ...base, value: "0" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...base, usageLimit: "0" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...base, minSubtotal: "9.5" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const ok = { password: "new-secret-1", confirm: "new-secret-1", token_hash: "abcdefghijkl" };
  it("needs matching passwords of 8+ characters and a token", () => {
    expect(resetPasswordSchema.safeParse(ok).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...ok, confirm: "other-secret" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...ok, password: "short", confirm: "short" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...ok, token_hash: "" }).success).toBe(false);
  });
});
