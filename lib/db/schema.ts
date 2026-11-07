import { boolean, integer, jsonb, pgTable, primaryKey, uuid, serial, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline").notNull().default(""),
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
}).enableRLS();

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  collectionId: integer("collection_id").references(() => collections.id, { onDelete: "set null" }),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** What the customer pays. */
  price: integer("price").notNull(),
  /** Regular price when the variant is on sale (shown crossed out); null when not on sale. */
  compareAtPrice: integer("compare_at_price"),
  stock: integer("stock").notNull().default(0),
  /** Admin-only shipping details for Delhivery: packed weight and box size. Null = not filled in. */
  weightGrams: integer("weight_grams"),
  lengthCm: numeric("length_cm", { precision: 6, scale: 1, mode: "number" }),
  widthCm: numeric("width_cm", { precision: 6, scale: 1, mode: "number" }),
  heightCm: numeric("height_cm", { precision: 6, scale: 1, mode: "number" }),
  sortOrder: integer("sort_order").notNull().default(0),
}).enableRLS();

export const ORDER_STATUSES = ["pending_payment", "paid", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  /** Supabase auth user id (auth.users.id); null for guest checkout. */
  userId: uuid("user_id"),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  addressLine: text("address_line").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  notes: text("notes").notNull().default(""),
  /** Private note for the shop team; never shown to the customer. */
  adminNote: text("admin_note").notNull().default(""),
  subtotal: integer("subtotal").notNull(),
  /** Coupon discount taken off the subtotal. */
  discount: integer("discount").notNull().default(0),
  couponCode: text("coupon_code"),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
  status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending_payment"),
  /** Delhivery waybill (AWB) number, set when the order ships. */
  trackingNumber: text("tracking_number"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  variantName: text("variant_name").notNull(),
  unitPrice: integer("unit_price").notNull(),
  /** Regular price when the item was bought on sale (shown crossed out to the admin); null if not on sale. */
  regularPrice: integer("regular_price"),
  quantity: integer("quantity").notNull(),
}).enableRLS();

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: uuid("user_id").notNull(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
).enableRLS();

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
}).enableRLS();

/** Admin overrides for site text (see lib/content-defaults.ts). Missing key = default copy. */
export const siteContent = pgTable("site_content", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

/** Messages sent through the contact form. */
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}).enableRLS();

export const COUPON_KINDS = ["percent", "flat"] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

/** Discount codes customers enter at checkout. */
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  /** Stored upper-case. */
  code: text("code").notNull().unique(),
  kind: text("kind", { enum: COUPON_KINDS }).notNull(),
  /** Percent (1–90) or rupees off. */
  value: integer("value").notNull(),
  minSubtotal: integer("min_subtotal").notNull().default(0),
  /** Cap for percent coupons, in rupees; null = no cap. */
  maxDiscount: integer("max_discount"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  /** null = unlimited. */
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const PAYMENT_STATUSES = ["created", "paid", "paid_after_cancel"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Online payment for an order (one Cashfree order per shop order). An order is marked paid only after
 * the server has confirmed the payment with Cashfree; nothing the browser sends can do it.
 */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("cashfree"),
  /** Cashfree environment the order was created in: sandbox or production. */
  mode: text("mode").notNull(),
  /** Our id for the Cashfree order, e.g. PY1042_k3j9x2a1. */
  providerOrderId: text("provider_order_id").notNull().unique(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: PAYMENT_STATUSES }).notNull().default("created"),
  /** Cashfree's id for the successful payment. */
  providerPaymentId: text("provider_payment_id").unique(),
  /** upi, credit_card, net_banking, … as reported by Cashfree. */
  method: text("method"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
