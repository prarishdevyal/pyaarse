import "server-only";
import { cache } from "react";
import { db, schema } from "./db";
import { contentLookup, type SiteContent } from "./content-defaults";
import { cashfreeConfig } from "./cashfree";

/** Site text for this request: admin overrides merged over defaults. */
export const getContent = cache(async (): Promise<SiteContent> => {
  const rows = await db.select({ key: schema.siteContent.key, value: schema.siteContent.value }).from(schema.siteContent);
  return contentLookup(Object.fromEntries(rows.map((r) => [r.key, r.value])), { payOnline: cashfreeConfig() !== null });
});

export async function getContentOverrides(): Promise<Record<string, string>> {
  const rows = await db.select({ key: schema.siteContent.key, value: schema.siteContent.value }).from(schema.siteContent);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
