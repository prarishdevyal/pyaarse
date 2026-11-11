import { sql } from "drizzle-orm";
import { productVariants } from "./db/schema";

/** The option's customer-facing name in SQL: "Box of 4 · Rose", or "Box of 4" without a sub-variant (same as variantLabel). */
export const variantLabelSql = sql<string>`case when ${productVariants.subName} = '' then ${productVariants.name} else ${productVariants.name} || ' · ' || ${productVariants.subName} end`;
