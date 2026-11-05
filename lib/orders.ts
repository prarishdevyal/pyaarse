import "server-only";
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { orderNumberFor } from "./format";
import { expiryCutoff, pendingOrderTtlHours } from "./order-expiry";
import { priceCart } from "./pricing";
import { getSettings } from "./settings";
import type { CheckoutInput } from "./validation";
import type { OrderSummary } from "./notify/types";
import { buildTelegramMessage, sendTelegram } from "./notify/telegram";
import { buildAdminOrderEmail, buildConfirmationEmail, buildInvoiceEmail, orderAlertEmail, sendEmail } from "./notify/email";
import { buildInvoicePdf, invoiceNumber } from "./invoice";
import { couponDiscount, normalizeCode, totalsWithDiscount } from "./discounts";
import { storeContact } from "./store";
import { siteUrl } from "./hosts";

const { orders, orderItems, productVariants, products, coupons } = schema;

class CheckoutError extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Returns the items of the given orders to stock and frees their coupon uses. Callers must hold the order rows locked. */
export async function restockOrders(tx: Tx, orderIds: number[]) {
  if (orderIds.length === 0) return;
  const used = await tx
    .select({ code: orders.couponCode, n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(inArray(orders.id, orderIds), isNotNull(orders.couponCode)))
    .groupBy(orders.couponCode);
  for (const u of used) {
    if (u.code) await tx.update(coupons).set({ usedCount: sql`greatest(${coupons.usedCount} - ${u.n}, 0)` }).where(eq(coupons.code, u.code));
  }
  const items = await tx.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  for (const i of items) {
    if (i.variantId) {
      await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${i.quantity}` })
        .where(eq(productVariants.id, i.variantId));
    }
  }
}

/** Cancels unpaid orders older than PENDING_ORDER_TTL_HOURS so they stop holding stock. */
export async function releaseExpiredOrders(now = new Date()): Promise<number> {
  const cutoff = expiryCutoff(now, pendingOrderTtlHours(process.env.PENDING_ORDER_TTL_HOURS));
  return db.transaction(async (tx) => {
    const expired = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, cutoff)))
      .orderBy(orders.id)
      .for("update", { skipLocked: true });
    const ids = expired.map((o) => o.id);
    if (ids.length === 0) return 0;
    await restockOrders(tx, ids);
    await tx.update(orders).set({ status: "cancelled" }).where(inArray(orders.id, ids));
    return ids.length;
  });
}

export async function placeOrder(
  input: CheckoutInput,
  userId: string | null,
): Promise<{ ok: true; orderId: number; orderNumber: string } | { ok: false; error: string }> {
  await releaseExpiredOrders();
  const { sendOrderEmails, ...settings } = await getSettings();
  try {
    const { order, summary } = await db.transaction(async (tx) => {
      const variantIds = [...new Set(input.items.map((i) => i.variantId))];
      const variants = await tx
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          productName: products.name,
          variantName: productVariants.name,
          price: productVariants.price,
          stock: productVariants.stock,
          isActive: products.isActive,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(inArray(productVariants.id, variantIds))
        .orderBy(productVariants.id)
        .for("update", { of: productVariants });

      const priced = priceCart(input.items, variants, settings);
      if (!priced.ok) throw new CheckoutError(priced.error);

      // The coupon row is locked so two orders can't both take its last use.
      const code = input.couponCode ? normalizeCode(input.couponCode) : "";
      let discount = 0;
      if (code) {
        const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, code)).for("update");
        const applied = couponDiscount(coupon, priced.subtotal);
        if (!applied.ok) throw new CheckoutError(`Coupon ${code}: ${applied.error} Remove it to place the order without it.`);
        discount = applied.discount;
        await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, coupon.id));
      }
      const totals = totalsWithDiscount(priced.subtotal, discount, settings);

      for (const l of priced.lines) {
        await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${l.quantity}` })
          .where(eq(productVariants.id, l.variantId));
      }

      const { items: _, couponCode: __, ...customer } = input;
      const [created] = await tx
        .insert(orders)
        .values({
          ...customer,
          orderNumber: `tmp-${crypto.randomUUID()}`,
          userId,
          subtotal: totals.subtotal,
          discount: totals.discount,
          couponCode: discount ? code : null,
          shipping: totals.shipping,
          total: totals.total,
        })
        .returning({ id: orders.id });
      const orderNumber = orderNumberFor(created.id);
      await tx.update(orders).set({ orderNumber }).where(eq(orders.id, created.id));
      await tx.insert(orderItems).values(
        priced.lines.map((l) => ({
          orderId: created.id,
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          variantName: l.variantName,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
      );

      const summary: OrderSummary = {
        ...customer,
        orderNumber,
        subtotal: totals.subtotal,
        discount: totals.discount,
        couponCode: discount ? code : null,
        shipping: totals.shipping,
        total: totals.total,
        items: priced.lines,
      };
      return { order: { id: created.id, orderNumber }, summary };
    });

    await notifyNewOrder(order.id, summary, sendOrderEmails);
    return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Notifications must never fail an order that is already saved. */
async function notifyNewOrder(orderId: number, summary: OrderSummary, emailCustomer: boolean) {
  const adminBase = process.env.ADMIN_URL;
  const adminOrderUrl = adminBase ? `${adminBase}/orders/${orderId}` : undefined;
  const alertTo = orderAlertEmail();
  const results = await Promise.allSettled([
    sendTelegram(buildTelegramMessage(summary, adminOrderUrl)),
    alertTo ? sendEmail(alertTo, buildAdminOrderEmail(summary, adminOrderUrl)) : Promise.resolve(),
    // The admin can switch customer confirmation emails off in Settings.
    emailCustomer ? sendEmail(summary.email, buildConfirmationEmail(summary)) : Promise.resolve(),
  ]);
  for (const r of results) if (r.status === "rejected") console.error("[order notify]", r.reason);
}

/** An order with its items, in the shape the emails and invoice use. */
export async function getOrderSummary(orderId: number): Promise<OrderSummary | null> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    addressLine: order.addressLine,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    notes: order.notes,
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: order.couponCode,
    shipping: order.shipping,
    total: order.total,
    items: items.map((i) => ({ productName: i.productName, variantName: i.variantName, unitPrice: i.unitPrice, quantity: i.quantity })),
  };
}

export async function invoicePdfFor(summary: OrderSummary, paid: boolean, invoiceDate = new Date()): Promise<Uint8Array> {
  const store = storeContact();
  return buildInvoicePdf({
    ...summary,
    invoiceDate,
    paid,
    store: { email: store.email, whatsapp: store.whatsapp, website: siteUrl().replace(/^https?:\/\//, "") },
  });
}

/** Emails the customer their invoice PDF. Returns the error message instead of throwing, so the admin can see it. */
export async function sendInvoice(orderId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const summary = await getOrderSummary(orderId);
    if (!summary) return { ok: false, error: "Order not found" };
    const no = invoiceNumber(summary.orderNumber);
    const pdf = await invoicePdfFor(summary, true);
    await sendEmail(summary.email, {
      ...buildInvoiceEmail(summary, no),
      attachments: [{ filename: `${no}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
    return { ok: true };
  } catch (e) {
    console.error("[invoice]", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
