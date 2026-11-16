import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings-parse";

describe("parseSettings", () => {
  it("uses defaults when nothing is stored", () => expect(parseSettings([])).toEqual(DEFAULT_SETTINGS));
  it("defaults to the Delhivery rate card, with COD off", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ baseRate: 50, slabRate: 30, gstPercent: 18, codEnabled: false, codFlatFee: 40, codPercent: 2, codMinOrder: 0, codMaxOrder: 0 });
  });
  it("reads stored values", () => {
    expect(parseSettings([
      { key: "shipping_base_rate", value: "55" },
      { key: "shipping_slab_rate", value: "32" },
      { key: "shipping_gst_percent", value: "18" },
      { key: "free_shipping_threshold", value: "1500" },
      { key: "cod_enabled", value: "true" },
      { key: "cod_flat_fee", value: "45" },
      { key: "cod_percent", value: "2.5" },
      { key: "cod_min_order", value: "300" },
      { key: "cod_max_order", value: "3000" },
      { key: "contact_email", value: "query@pyaarse.net" },
      { key: "contact_whatsapp", value: "919876543210" },
      { key: "contact_instagram", value: "pyaarse_net" },
    ])).toEqual({
      baseRate: 55, slabRate: 32, gstPercent: 18, freeShippingThreshold: 1500,
      codEnabled: true, codFlatFee: 45, codPercent: 2.5, codMinOrder: 300, codMaxOrder: 3000,
      maintenance: false,
      contactEmail: "query@pyaarse.net", contactWhatsapp: "919876543210", contactInstagram: "pyaarse_net",
    });
  });
  it("ignores corrupt numbers", () => {
    expect(parseSettings([{ key: "shipping_base_rate", value: "-3" }]).baseRate).toBe(50);
    expect(parseSettings([{ key: "cod_percent", value: "abc" }]).codPercent).toBe(2);
    expect(parseSettings([{ key: "cod_flat_fee", value: "" }]).codFlatFee).toBe(40);
  });
});

describe("maintenance mode", () => {
  it("is off unless switched on", () => {
    expect(parseSettings([]).maintenance).toBe(false);
    expect(parseSettings([{ key: "maintenance_mode", value: "false" }]).maintenance).toBe(false);
    expect(parseSettings([{ key: "maintenance_mode", value: "true" }]).maintenance).toBe(true);
  });
});
