import "server-only";
import { db, schema } from "./db";
import type { ShippingSettings } from "./pricing";
import { parseSettings, type ShopSettings } from "./settings-parse";
import { storeContact } from "./store";

export { DEFAULT_SETTINGS } from "./settings-parse";

export async function getSettings(): Promise<ShopSettings> {
  return parseSettings(await db.select().from(schema.settings));
}

/** The shop's contact details: what the admin saved in Settings, else the STORE_* env values, else defaults. */
export async function getStoreContact() {
  const s = await getSettings();
  return storeContact(process.env, { email: s.contactEmail, whatsapp: s.contactWhatsapp, instagram: s.contactInstagram });
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const { shippingFee, freeShippingThreshold } = await getSettings();
  return { shippingFee, freeShippingThreshold };
}

/** Turns maintenance mode on or off (its own switch, so saving other settings never changes it). */
export async function setMaintenance(on: boolean): Promise<void> {
  const value = String(on);
  await db.insert(schema.settings).values({ key: "maintenance_mode", value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}

export const MAINTENANCE_MESSAGE = "The shop is closed for a short while for maintenance. Please try again soon.";

export async function saveSettings(s: Omit<ShopSettings, "maintenance">): Promise<void> {
  const rows: [string, string][] = [
    ["shipping_fee", String(s.shippingFee)],
    ["free_shipping_threshold", String(s.freeShippingThreshold)],
    ["contact_email", s.contactEmail],
    ["contact_whatsapp", s.contactWhatsapp],
    ["contact_instagram", s.contactInstagram],
  ];
  for (const [key, value] of rows) {
    await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  }
}
