import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { variantLabelSql } from "./variants-sql";
import { PRODUCT_PLACEHOLDER } from "./catalog";

const { products, productVariants, orders, orderItems } = schema;

export type StockRow = {
  variantId: number;
  productId: number;
  name: string;
  option: string;
  image: string;
  stock: number;
  visible: boolean;
  /** Units in orders still waiting for payment (already taken out of stock; returned if they're cancelled). */
  held: number;
};

/** Every product option with its stock and how many units unpaid orders are holding. */
export async function getStockRows(): Promise<StockRow[]> {
  const held = db
    .select({ variantId: orderItems.variantId, units: sql<number>`sum(${orderItems.quantity})::int`.as("units") })
    .from(orderItems)
    .innerJoin(orders, and(eq(orders.id, orderItems.orderId), eq(orders.status, "pending_payment")))
    .groupBy(orderItems.variantId)
    .as("held");
  const rows = await db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      name: products.name,
      option: variantLabelSql,
      images: products.images,
      stock: productVariants.stock,
      visible: products.isActive,
      held: sql<number>`coalesce(${held.units}, 0)`,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(held, eq(held.variantId, productVariants.id))
    .orderBy(asc(productVariants.stock), asc(products.name));
  return rows.map(({ images, held: h, ...r }) => ({ ...r, image: images[0] ?? PRODUCT_PLACEHOLDER, held: Number(h) }));
}
