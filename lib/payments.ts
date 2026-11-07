import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import {
  CashfreeError,
  cashfreeClient,
  cashfreeConfig,
  providerOrderIdFor,
  sameAmount,
  successfulPayment,
  type CashfreeClient,
  type CashfreeMode,
  type CashfreeOrder,
} from "./cashfree";
import { canStartPayment, paymentDeadline, pendingOrderTtlHours } from "./order-expiry";
import { siteUrl } from "./hosts";
import { payPath } from "./pay-link";
import { formatINR } from "./format";
import { sendTelegram } from "./notify/telegram";
import { orderAlertEmail, sendEmail } from "./notify/email";
import { sendInvoice } from "./orders";

const { orders, payments } = schema;
type Order = typeof orders.$inferSelect;
export type Payment = typeof payments.$inferSelect;

export const WEBHOOK_PATH = "/api/payments/cashfree";

function gateway() {
  const config = cashfreeConfig();
  return config ? { config, api: cashfreeClient(config) } : null;
}

/** Online payment is on once the key pair for CASHFREE_ENV is filled in. */
export const onlinePaymentsEnabled = () => cashfreeConfig() !== null;

const ttlHours = () => pendingOrderTtlHours(process.env.PENDING_ORDER_TTL_HOURS);

/** A Cashfree order, or null if Cashfree has never heard of it. */
async function findCashfreeOrder(api: CashfreeClient, id: string): Promise<CashfreeOrder | null> {
  try {
    return await api.getOrder(id);
  } catch (e) {
    if (e instanceof CashfreeError && e.status === 404) return null;
    throw e;
  }
}

/** The payment row for an order, created on first use. A row from the other Cashfree environment is replaced. */
async function paymentRow(order: Order, mode: CashfreeMode): Promise<Payment> {
  const fresh = () => ({ mode, providerOrderId: providerOrderIdFor(order.orderNumber), amount: order.total });
  await db.insert(payments).values({ orderId: order.id, ...fresh() }).onConflictDoNothing({ target: payments.orderId });
  const [row] = await db.select().from(payments).where(eq(payments.orderId, order.id));
  if (row.mode === mode || row.status !== "created") return row;
  const [replaced] = await db
    .update(payments)
    .set({ ...fresh(), updatedAt: new Date() })
    .where(and(eq(payments.id, row.id), eq(payments.status, "created")))
    .returning();
  return replaced ?? row;
}

export type StartPaymentResult =
  | { ok: true; sessionId: string; mode: CashfreeMode }
  | { ok: false; error: string; paid?: boolean };

const CONTACT_US = "Please message us on WhatsApp and we'll help you pay.";

/** Opens (or reopens) the Cashfree checkout for an unpaid order. The amount always comes from our database. */
export async function startPayment(orderNumber: string): Promise<StartPaymentResult> {
  const gw = gateway();
  if (!gw) return { ok: false, error: `Online payment isn't available right now. ${CONTACT_US}` };
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  if (!order) return { ok: false, error: "We couldn't find that order." };
  if (order.status === "cancelled") return { ok: false, error: `This order was cancelled, so it can't be paid. ${CONTACT_US}` };
  if (order.status !== "pending_payment") return { ok: false, paid: true, error: "This order is already paid." };

  const deadline = paymentDeadline(order.createdAt, ttlHours());
  if (!canStartPayment(deadline, new Date())) return { ok: false, error: `The time to pay for this order has run out. ${CONTACT_US}` };

  try {
    const row = await paymentRow(order, gw.config.mode);
    if (row.status !== "created") return { ok: false, paid: true, error: "This order is already paid." };
    let cf = await findCashfreeOrder(gw.api, row.providerOrderId);
    if (!cf) {
      const site = siteUrl();
      const input = {
        providerOrderId: row.providerOrderId,
        amount: order.total,
        customerId: order.userId ? order.userId : `guest${order.id}`,
        name: order.customerName,
        email: order.email,
        phone: order.phone,
        returnUrl: `${site}${payPath(order.orderNumber)}`,
        notifyUrl: `${site}${WEBHOOK_PATH}`,
        expiresAt: deadline,
      };
      try {
        cf = await gw.api.createOrder(input);
      } catch (e) {
        // A double click can race us to it; the idempotency key makes the second create a no-op.
        if (!(e instanceof CashfreeError && e.status === 409)) throw e;
        cf = await gw.api.getOrder(row.providerOrderId);
      }
    }
    if (cf.order_status === "PAID") {
      await reconcilePayment(order.id);
      return { ok: false, paid: true, error: "This order is already paid." };
    }
    if (cf.order_status !== "ACTIVE" || !cf.payment_session_id) return { ok: false, error: `This payment link has expired. ${CONTACT_US}` };
    // The admin may have marked the order paid or cancelled while we were talking to Cashfree.
    const [now] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, order.id));
    if (now.status !== "pending_payment") {
      await gw.api.terminateOrder(row.providerOrderId).catch((e) => console.error("[payments] terminate", e instanceof Error ? e.message : e));
      return now.status === "cancelled"
        ? { ok: false, error: `This order was cancelled, so it can't be paid. ${CONTACT_US}` }
        : { ok: false, paid: true, error: "This order is already paid." };
    }
    if (!sameAmount(cf.order_amount, order.total)) {
      console.error("[payments] amount differs from Cashfree", order.orderNumber);
      return { ok: false, error: `Something doesn't add up with this order's amount. ${CONTACT_US}` };
    }
    return { ok: true, sessionId: cf.payment_session_id, mode: gw.config.mode };
  } catch (e) {
    console.error("[payments] start failed", order.orderNumber, e instanceof Error ? e.message : e);
    return { ok: false, error: `We couldn't open the payment page. Please try again in a minute. If it keeps failing, ${CONTACT_US.toLowerCase()}` };
  }
}

/** none = never started online; pending = awaiting payment; paid = confirmed; closed = expired or stopped unpaid. */
export type PaymentState = "none" | "pending" | "paid" | "closed";

/**
 * Asks Cashfree (server to server) whether the order is paid and, if it is and the amount matches,
 * marks it paid exactly once. Safe to call any number of times, from the webhook or the return page.
 */
export async function reconcilePayment(orderId: number): Promise<PaymentState> {
  const gw = gateway();
  if (!gw) return "none";
  const [row] = await db.select().from(payments).where(eq(payments.orderId, orderId));
  if (!row || row.mode !== gw.config.mode) return "none";
  if (row.status !== "created") return "paid";

  const cf = await findCashfreeOrder(gw.api, row.providerOrderId);
  if (!cf) return "none";
  if (cf.order_status === "ACTIVE") return "pending";
  if (cf.order_status !== "PAID") return "closed";

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  const paid = successfulPayment(cf, await gw.api.getPayments(row.providerOrderId), order.total);
  if (!paid) {
    console.error("[payments] PAID order failed the amount check", order.orderNumber);
    await alert(`⚠️ ${order.orderNumber}: Cashfree says paid, but the amount doesn't match ${formatINR(order.total)}. Not marked paid; please check the Cashfree dashboard.`);
    return "pending";
  }

  const paidAt = paid.payment_time && !Number.isNaN(Date.parse(paid.payment_time)) ? new Date(paid.payment_time) : new Date();
  const outcome = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    const [p] = await tx.select().from(payments).where(eq(payments.id, row.id)).for("update");
    if (p.status !== "created") return "already" as const;
    const afterCancel = o.status === "cancelled";
    await tx
      .update(payments)
      .set({
        status: afterCancel ? "paid_after_cancel" : "paid",
        providerPaymentId: String(paid.cf_payment_id),
        method: paid.payment_group ?? null,
        paidAt,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, p.id));
    if (afterCancel) return "after_cancel" as const;
    if (o.status !== "pending_payment") return "already_paid" as const;
    await tx.update(orders).set({ status: "paid" }).where(eq(orders.id, o.id));
    return "marked" as const;
  });

  const method = paid.payment_group ? ` by ${paid.payment_group.replace(/_/g, " ")}` : "";
  const test = row.mode === "sandbox" ? "🧪 TEST MODE (no real money, don't ship) " : "";
  if (outcome === "marked") {
    const invoice = await sendInvoice(orderId);
    await alert(`${test}💰 ${order.orderNumber} paid online: ${formatINR(order.total)}${method}. ${invoice.ok ? "Invoice emailed to the customer." : `Invoice email failed: ${invoice.error}`}`);
  } else if (outcome === "already_paid") {
    await alert(`${test}⚠️ ${order.orderNumber} was paid online (${formatINR(order.total)}${method}), but it had already been marked paid by hand. If the customer also paid you directly, refund one payment.`);
  } else if (outcome === "after_cancel") {
    const text = `${test}⚠️ ${order.orderNumber} was paid online (${formatINR(order.total)}${method}) after the order had been cancelled and its stock released. Refund it from the Cashfree dashboard, or contact the customer.`;
    await alert(text);
    const to = orderAlertEmail();
    if (to) await sendEmail(to, { subject: `Paid after cancel: ${order.orderNumber}`, text, html: `<p>${text}</p>` }).catch((e) => console.error("[payments] alert email", e));
  }
  return "paid";
}

/** For the webhook: the order behind one of our Cashfree order ids. */
export async function reconcileByProviderOrderId(providerOrderId: string): Promise<PaymentState> {
  const [row] = await db.select({ orderId: payments.orderId }).from(payments).where(eq(payments.providerOrderId, providerOrderId));
  return row ? reconcilePayment(row.orderId) : "none";
}

/**
 * When the admin marks an order paid or cancelled by hand, stop the online checkout so the customer
 * can't pay twice. Best effort: a payment already in progress is caught by reconcilePayment.
 */
export async function closeOnlinePayment(orderId: number): Promise<void> {
  const gw = gateway();
  if (!gw) return;
  const [row] = await db.select().from(payments).where(eq(payments.orderId, orderId));
  if (!row || row.status !== "created" || row.mode !== gw.config.mode) return;
  try {
    // Pick up a payment that completed a moment ago before stopping the checkout.
    if ((await reconcilePayment(orderId)) === "pending") await gw.api.terminateOrder(row.providerOrderId);
  } catch (e) {
    console.error("[payments] close failed", row.providerOrderId, e instanceof Error ? e.message : e);
  }
}

/**
 * Before unpaid orders are auto-cancelled, catch any payment whose confirmation hasn't arrived yet.
 * Returns the orders that couldn't be checked (Cashfree unreachable): those must not be cancelled yet.
 */
export async function reconcileBeforeExpiry(orderIds: number[]): Promise<number[]> {
  const unchecked: number[] = [];
  for (const id of orderIds) {
    try {
      await reconcilePayment(id);
    } catch (e) {
      unchecked.push(id);
      console.error("[payments] pre-expiry check failed", id, e instanceof Error ? e.message : e);
    }
  }
  return unchecked;
}

export async function getPayment(orderId: number): Promise<Payment | null> {
  const [row] = await db.select().from(payments).where(eq(payments.orderId, orderId));
  return row ?? null;
}

async function alert(text: string) {
  await sendTelegram(text).catch((e) => console.error("[payments] telegram", e));
}

export type PayView = { orderNumber: string; total: number; status: Order["status"]; state: PaymentState };

/** What the order-confirmed page shows about paying. Re-checks with Cashfree when a payment was started. */
export async function payView(orderNumber: string): Promise<PayView | null> {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  if (!order) return null;
  let state: PaymentState = "none";
  if (order.status === "pending_payment") {
    try {
      state = await reconcilePayment(order.id);
    } catch (e) {
      console.error("[payments] status check failed", orderNumber, e instanceof Error ? e.message : e);
      state = "pending";
    }
  }
  const [fresh] = state === "paid" ? await db.select({ status: orders.status }).from(orders).where(eq(orders.id, order.id)) : [order];
  return { orderNumber, total: order.total, status: fresh.status, state };
}
