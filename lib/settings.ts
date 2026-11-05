import "server-only";
import { db, schema } from "./db";
import type { ShippingSettings } from "./pricing";
import { parseSettings, type ShopSettings } from "./settings-parse";

export { DEFAULT_SETTINGS } from "./settings-parse";

export async function getSettings(): Promise<ShopSettings> {
  return parseSettings(await db.select().from(schema.settings));
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const { shippingFee, freeShippingThreshold } = await getSettings();
  return { shippingFee, freeShippingThreshold };
}

export async function saveSettings(s: ShopSettings): Promise<void> {
  const rows: [string, string][] = [
    ["shipping_fee", String(s.shippingFee)],
    ["free_shipping_threshold", String(s.freeShippingThreshold)],
    ["send_order_emails", String(s.sendOrderEmails)],
  ];
  for (const [key, value] of rows) {
    await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  }
}
