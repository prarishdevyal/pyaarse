import { DEFAULT_RATES, type ShippingRates } from "./shipping";

export type ShopSettings = ShippingRates & {
  /** While on, shoppers see a "back soon" page and no orders or payments can be made. The admin keeps working. */
  maintenance: boolean;
  /** Contact details shown on the shop and invoices. Empty = the built-in default. */
  contactEmail: string;
  contactWhatsapp: string;
  contactInstagram: string;
};

export const DEFAULT_SETTINGS: ShopSettings = {
  ...DEFAULT_RATES,
  maintenance: false,
  contactEmail: "",
  contactWhatsapp: "",
  contactInstagram: "",
};

/** Settings table key for each shipping rate. */
export const RATE_KEYS: Record<keyof ShippingRates, string> = {
  baseRate: "shipping_base_rate",
  slabRate: "shipping_slab_rate",
  gstPercent: "shipping_gst_percent",
  freeShippingThreshold: "free_shipping_threshold",
  codEnabled: "cod_enabled",
  codFlatFee: "cod_flat_fee",
  codPercent: "cod_percent",
  codMinOrder: "cod_min_order",
  codMaxOrder: "cod_max_order",
};

export function parseSettings(rows: { key: string; value: string }[]): ShopSettings {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  /** A stored number (0 or more, at most 2 decimals), else the default. */
  const num = (k: keyof ShippingRates) => {
    const raw = m.get(RATE_KEYS[k]);
    const n = Number(raw);
    return raw !== undefined && raw.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : (DEFAULT_RATES[k] as number);
  };
  return {
    baseRate: num("baseRate"),
    slabRate: num("slabRate"),
    gstPercent: num("gstPercent"),
    freeShippingThreshold: num("freeShippingThreshold"),
    codEnabled: m.get(RATE_KEYS.codEnabled) === "true",
    codFlatFee: num("codFlatFee"),
    codPercent: num("codPercent"),
    codMinOrder: num("codMinOrder"),
    codMaxOrder: num("codMaxOrder"),
    maintenance: m.get("maintenance_mode") === "true",
    contactEmail: m.get("contact_email") ?? "",
    contactWhatsapp: m.get("contact_whatsapp") ?? "",
    contactInstagram: m.get("contact_instagram") ?? "",
  };
}
