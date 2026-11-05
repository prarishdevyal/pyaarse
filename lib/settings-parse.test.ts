import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings-parse";

describe("parseSettings", () => {
  it("uses defaults when nothing is stored", () => expect(parseSettings([])).toEqual(DEFAULT_SETTINGS));
  it("reads stored values", () => {
    expect(parseSettings([
      { key: "shipping_fee", value: "50" },
      { key: "free_shipping_threshold", value: "1500" },
      { key: "send_order_emails", value: "false" },
    ])).toEqual({ shippingFee: 50, freeShippingThreshold: 1500, sendOrderEmails: false });
  });
  it("ignores corrupt numbers", () => {
    expect(parseSettings([{ key: "shipping_fee", value: "-3" }]).shippingFee).toBe(DEFAULT_SETTINGS.shippingFee);
  });
});
