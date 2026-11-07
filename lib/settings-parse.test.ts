import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings-parse";

describe("parseSettings", () => {
  it("uses defaults when nothing is stored", () => expect(parseSettings([])).toEqual(DEFAULT_SETTINGS));
  it("reads stored values", () => {
    expect(parseSettings([
      { key: "shipping_fee", value: "50" },
      { key: "free_shipping_threshold", value: "1500" },
      { key: "send_order_emails", value: "false" },
      { key: "contact_email", value: "query@pyaarse.net" },
      { key: "contact_whatsapp", value: "919876543210" },
      { key: "contact_instagram", value: "pyaarse_net" },
    ])).toEqual({
      shippingFee: 50, freeShippingThreshold: 1500, maintenance: false,
      contactEmail: "query@pyaarse.net", contactWhatsapp: "919876543210", contactInstagram: "pyaarse_net",
    });
  });
  it("ignores corrupt numbers", () => {
    expect(parseSettings([{ key: "shipping_fee", value: "-3" }]).shippingFee).toBe(DEFAULT_SETTINGS.shippingFee);
  });
});

describe("maintenance mode", () => {
  it("is off unless switched on", () => {
    expect(parseSettings([]).maintenance).toBe(false);
    expect(parseSettings([{ key: "maintenance_mode", value: "false" }]).maintenance).toBe(false);
    expect(parseSettings([{ key: "maintenance_mode", value: "true" }]).maintenance).toBe(true);
  });
});
