export type ShopSettings = {
  shippingFee: number;
  freeShippingThreshold: number;
  sendOrderEmails: boolean;
  /** Contact details shown on the shop and invoices. Empty = the built-in default. */
  contactEmail: string;
  contactWhatsapp: string;
  contactInstagram: string;
};

export const DEFAULT_SETTINGS: ShopSettings = {
  shippingFee: 79,
  freeShippingThreshold: 999,
  sendOrderEmails: true,
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
    sendOrderEmails: m.has("send_order_emails") ? m.get("send_order_emails") === "true" : DEFAULT_SETTINGS.sendOrderEmails,
    contactEmail: m.get("contact_email") ?? "",
    contactWhatsapp: m.get("contact_whatsapp") ?? "",
    contactInstagram: m.get("contact_instagram") ?? "",
  };
}
