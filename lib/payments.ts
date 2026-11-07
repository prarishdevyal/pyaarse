import "server-only";
import { and, eq, gt } from "drizzle-orm";
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
import { canStartPayment, checkoutExpiry, isOverdue, payWindowEnd } from "./order-expiry";
import { siteUrl } from "./hosts";
import { payPath } from "./pay-link";
import { formatINR } from "./format";
import { sendTelegram } from "./notify/telegram";
import { orderAlertEmail, sendEmail } from "./notify/email";
import { alertNewOrder, getOrderSummary, releaseExpiredOrders, sendInvoice } from "./orders";

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
  | { ok: false; error: string; paid?: boolean; closed?: boolean };

const CONTACT_US = "If you need help, message us.";

/** A payment page that closes within this time isn't reused for a new attempt: the customer gets a fresh one. */
const MIN_REUSE_MS = 6 * 60_000;

/** Starts a new Cashfree order for the same shop order (the old one is closed for good: terminated or expired). */
async function newAttempt(row: Payment, orderNumber: string): Promise<Payment> {
  const [next] = await db
    .update(payments)
    .set({ providerOrderId: providerOrderIdFor(orderNumber), updatedAt: new Date() })
    .where(and(eq(payments.id, row.id), eq(payments.status, "created")))
    .returning();
  return next ?? row;
}

/** Keeps the order held while Cashfree's payment page is open. False if the order is no longer awaiting payment. */
async function holdUntil(orderId: number, until: Date): Promise<boolean> {
  const held = await db
    .update(orders)
    .set({ payBy: until })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
    .returning({ id: orders.id });
  return held.length > 0;
}

/** Opens (or reopens) the Cashfree checkout for an unpaid order. The amount always comes from our database. */
export async function startPayment(orderNumber: string): Promise<StartPaymentResult> {
  const gw = gateway();
  if (!gw) return { ok: false, error: `Online payment isn't available right now. ${CONTACT_US}` };
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  if (!order) return { ok: false, error: "We couldn't find that order." };
  if (order.status === "cancelled") return { ok: false, closed: true, error: "This order was cancelled, so it can't be paid." };
  if (order.status !== "pending_payment") return { ok: false, paid: true, error: "This order is already paid." };
  if (!canStartPayment(order.payBy, new Date())) return { ok: false, closed: true, error: "The time to pay for this order has run out." };

  try {
    let row = await paymentRow(order, gw.config.mode);
    if (row.status !== "created") return { ok: false, paid: true, error: "This order is already paid." };
    let cf = await findCashfreeOrder(gw.api, row.providerOrderId);
    // Reuse an open payment page only if it stays open long enough to pay; otherwise close it and start fresh.
    if (cf?.order_status === "ACTIVE" && cf.order_expiry_time && Date.parse(cf.order_expiry_time) - Date.now() < MIN_REUSE_MS) {
      cf = await gw.api.terminateOrder(row.providerOrderId);
    }
    if (cf?.order_status === "TERMINATION_REQUESTED") return { ok: false, error: "Your last payment attempt is still being checked. Please wait a minute and try again." };
    // A closed payment page (expired, or stopped after a failed payment) can't take money any more: open a new one.
    if (cf && (cf.order_status === "TERMINATED" || cf.order_status === "EXPIRED")) {
      row = await newAttempt(row, order.orderNumber);
      cf = null;
    }
    if (!cf) {
      const expiresAt = checkoutExpiry(new Date());
      // Hold the candles for as long as the payment page stays open.
      if (!(await holdUntil(order.id, expiresAt))) return { ok: false, closed: true, error: "This order is no longer awaiting payment." };
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
        expiresAt,
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
    if (cf.order_status !== "ACTIVE" || !cf.payment_session_id) return { ok: false, error: `We couldn't open the payment page. Please try again. ${CONTACT_US}` };
    // Reusing an open payment page: keep the order held until that page closes.
    if (cf.order_expiry_time && !Number.isNaN(Date.parse(cf.order_expiry_time))) {
      const until = new Date(Date.parse(cf.order_expiry_time));
      if (until > order.payBy) await holdUntil(order.id, until);
    }
    // The admin may have marked the order paid or cancelled while we were talking to Cashfree.
    const [now] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, order.id));
    if (now.status !== "pending_payment") {
      await gw.api.terminateOrder(row.providerOrderId).catch((e) => console.error("[payments] terminate", e instanceof Error ? e.message : e));
      return now.status === "cancelled"
        ? { ok: false, closed: true, error: "This order was cancelled, so it can't be paid." }
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
    // This is the moment the order is really placed: the customer's invoice email is their confirmation,
    // and the shop gets the full new-order alert (nothing was sent while the order was unpaid).
    const invoice = await sendInvoice(orderId);
    const status = `${test}Paid online ${formatINR(order.total)}${method}. ${invoice.ok ? "Invoice emailed to the customer." : `Invoice email failed: ${invoice.error}`}`;
    const summary = await getOrderSummary(orderId);
    if (summary) await alertNewOrder(orderId, summary, status);
    else await alert(`${test}💰 ${order.orderNumber} ${status}`);
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
 * Before unpaid orders are auto-cancelled: catch any payment whose confirmation hasn't arrived yet, and close
 * any payment page still open so nobody can pay for a cancelled order. Returns the orders that couldn't be
 * settled (Cashfree unreachable, or a payment still in progress): those must not be cancelled yet.
 */
export async function reconcileBeforeExpiry(orderIds: number[]): Promise<number[]> {
  const gw = gateway();
  const unchecked: number[] = [];
  for (const id of orderIds) {
    try {
      if ((await reconcilePayment(id)) !== "pending" || !gw) continue;
      const [row] = await db.select().from(payments).where(eq(payments.orderId, id));
      let closed = await gw.api.terminateOrder(row.providerOrderId);
      // Cashfree often answers "termination requested" and finishes a moment later: look once more.
      if (closed.order_status === "TERMINATION_REQUESTED") {
        await new Promise((r) => setTimeout(r, 1500));
        closed = await gw.api.getOrder(row.providerOrderId);
      }
      if (closed.order_status === "PAID") await reconcilePayment(id);
      else if (closed.order_status !== "TERMINATED") unchecked.push(id);
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

/**
 * What the order page shows:
 * - start: no payment tried yet (straight after checkout the page opens Cashfree by itself);
 * - retry: a payment didn't complete; the customer has until payBy (at most 5 minutes) to try again;
 * - processing: a payment is still going through (or Cashfree can't be reached): the page checks again shortly;
 * - paid / cancelled: final.
 */
export type PayPhase = "start" | "retry" | "processing" | "paid" | "cancelled";
export type PayView = { orderNumber: string; total: number; email: string; phase: PayPhase; payBy: string };

async function readOrder(orderNumber: string) {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  return order ?? null;
}

/** True while Cashfree is still finishing a payment (e.g. waiting for the customer to approve it in their UPI app). */
async function paymentInProgress(api: CashfreeClient, providerOrderId: string): Promise<boolean> {
  const list = await api.getPayments(providerOrderId);
  return list.some((p) => p.payment_status === "PENDING");
}

/** The order page's view of an order. Re-checks with Cashfree, and cancels the order if its time to pay has run out. */
export async function payView(orderNumber: string, now = new Date()): Promise<PayView | null> {
  let order = await readOrder(orderNumber);
  if (!order) return null;
  let state: PaymentState | "unknown" = "none";
  if (order.status === "pending_payment") {
    try {
      state = await reconcilePayment(order.id);
    } catch (e) {
      console.error("[payments] status check failed", orderNumber, e instanceof Error ? e.message : e);
      state = "unknown";
    }
    order = (await readOrder(orderNumber))!;
    if (order.status === "pending_payment" && isOverdue(order.payBy, now)) {
      await releaseExpiredOrders(now);
      order = (await readOrder(orderNumber))!;
    }
  }
  const view = (phase: PayPhase): PayView => ({ orderNumber, total: order!.total, email: order!.email, phase, payBy: order!.payBy.toISOString() });
  if (order.status === "cancelled") return view("cancelled");
  if (order.status !== "pending_payment") return view("paid");
  if (state === "none") return view("start");
  if (state === "unknown" || isOverdue(order.payBy, now)) return view("processing");

  if (state === "pending") {
    const gw = gateway();
    const [row] = await db.select().from(payments).where(eq(payments.orderId, order.id));
    try {
      if (gw && row && (await paymentInProgress(gw.api, row.providerOrderId))) return view("processing");
    } catch {
      return view("processing");
    }
  }
  // The payment didn't complete: from now the customer has at most 5 minutes to try again.
  const retryBy = payWindowEnd(now);
  if (order.payBy > retryBy) {
    await db.update(orders).set({ payBy: retryBy }).where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment"), gt(orders.payBy, retryBy)));
    order = { ...order, payBy: retryBy };
  }
  return view("retry");
}
