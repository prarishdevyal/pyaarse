export type ShopSettings = {
  shippingFee: number;
  freeShippingThreshold: number;
  /** Contact details shown on the shop and invoices. Empty = the built-in default. */
  contactEmail: string;
  contactWhatsapp: string;
  contactInstagram: string;
};

export const DEFAULT_SETTINGS: ShopSettings = {
  shippingFee: 79,
  freeShippingThreshold: 999,
  contactEmail: "",
  contactWhatsapp: "",
  contactInstagram: "",
};

export function parseSettings(rows: { key: string; value: string }[]): ShopSettings {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const int = (k: string, d: number) => {
    const n = Number(m.get(k));
    return m.has(k) && Number.isInteger(n) && n >= 0 ? n : d;
  };
  return {
    shippingFee: int("shipping_fee", DEFAULT_SETTINGS.shippingFee),
    freeShippingThreshold: int("free_shipping_threshold", DEFAULT_SETTINGS.freeShippingThreshold),
    contactEmail: m.get("contact_email") ?? "",
    contactWhatsapp: m.get("contact_whatsapp") ?? "",
    contactInstagram: m.get("contact_instagram") ?? "",
  };
}
