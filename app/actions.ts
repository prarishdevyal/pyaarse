"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { variantLabelSql } from "@/lib/variants-sql";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductCards, type ProductCard } from "@/lib/catalog";
import { findTrackedOrder, placeOrder, type TrackedOrder } from "@/lib/orders";
import { priceCart, type CartLine } from "@/lib/pricing";
import { couponDiscount, normalizeCode, totalsWithDiscount } from "@/lib/discounts";
import { getShippingSettings } from "@/lib/settings";
import { cartItemsSchema, checkoutSchema, contactSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, trackOrderSchema } from "@/lib/validation";
import { resetSentMessage, sendPasswordResetLink } from "@/lib/password-reset";
import { buildContactTelegramMessage, sendTelegram } from "@/lib/notify/telegram";
import { safeNext } from "@/lib/redirect";
import { siteUrl } from "@/lib/hosts";
import { clientIp, limits, TOO_MANY } from "@/lib/limits";
import { checkPayToken, payToken } from "@/lib/pay-link";
import { startPayment, type StartPaymentResult } from "@/lib/payments";

export type FormState = { error?: string; success?: string; fieldErrors?: Record<string, string> } | undefined;

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

// ---------- Cart & checkout ----------

export async function quoteCart(input: CartLine[], couponCode = "") {
  const settings = await getShippingSettings();
  const parsed = cartItemsSchema.safeParse(input);
  if (!parsed.success) return { quote: { ok: false as const, error: "Your cart could not be read. Please refresh." }, settings, variants: [] };
  if (!await limits.quoteByIp.hit(await clientIp())) return { quote: { ok: false as const, error: TOO_MANY }, settings, variants: [] };
  const lines = parsed.data;
  const ids = lines.map((l) => l.variantId);
  if (ids.length === 0) return { quote: { ok: false as const, error: "Your cart is empty." }, settings, variants: [] };
  const rows = await db
    .select({
      id: schema.productVariants.id,
      productId: schema.productVariants.productId,
      productName: schema.products.name,
      variantName: variantLabelSql,
      price: schema.productVariants.price,
      compareAtPrice: schema.productVariants.compareAtPrice,
      stock: schema.productVariants.stock,
      isActive: schema.products.isActive,
    })
    .from(schema.productVariants)
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(and(inArray(schema.productVariants.id, ids), eq(schema.products.isActive, true)));
  // Only what the cart UI needs, and never anything about hidden products.
  const variants = rows.map(({ id, price, compareAtPrice, stock }) => ({ id, price, compareAtPrice, stock }));
  const priced = priceCart(lines, rows, settings);
  if (!priced.ok) return { quote: priced, settings, variants };

  const code = normalizeCode(couponCode.slice(0, 30));
  let discount = 0;
  let couponError: string | undefined;
  if (code) {
    const coupon = await db.query.coupons.findFirst({ where: eq(schema.coupons.code, code) });
    const applied = couponDiscount(coupon, priced.subtotal);
    if (applied.ok) discount = applied.discount;
    else couponError = applied.error;
  }
  const quote = { ...priced, ...totalsWithDiscount(priced.subtotal, discount, settings), couponCode: discount ? code : null, couponError };
  return { quote, settings, variants };
}

export async function checkout(
  input: unknown,
): Promise<{ ok: true; orderNumber: string; payToken: string } | { ok: false; error?: string; fieldErrors?: Record<string, string> }> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error.issues) };
  const ipOk = await limits.checkoutByIp.hit(await clientIp());
  if (!ipOk || !await limits.checkoutByEmail.hit(parsed.data.email)) return { ok: false, error: TOO_MANY };
  const user = await getCurrentUser();
  const result = await placeOrder(parsed.data, user?.id ?? null);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, orderNumber: result.orderNumber, payToken: payToken(result.orderNumber) };
}

// ---------- Online payment ----------

/** Opens the Cashfree checkout for an unpaid order. Needs the order's pay-link token, not just its number. */
export async function payForOrder(orderNumber: string, token: string): Promise<StartPaymentResult> {
  if (typeof orderNumber !== "string" || !/^PY\d{1,9}$/.test(orderNumber) || !checkPayToken(orderNumber, token)) {
    return { ok: false, error: "This payment link isn't valid. Open it again from the Track page." };
  }
  const ipOk = await limits.payByIp.hit(await clientIp());
  if (!ipOk || !await limits.payByOrder.hit(orderNumber)) return { ok: false, error: TOO_MANY };
  return startPayment(orderNumber);
}

// ---------- Accounts ----------

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  if (!await limits.registerByIp.hit(await clientIp())) return { error: TOO_MANY };
  const { name, email, password } = parsed.data;
  const next = safeNext(formData.get("next"));
  const site = siteUrl();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${site}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.code === "weak_password" ? error.message : "Could not create your account. Please try again." };
  // With email confirmation on, Supabase returns the same response for new and existing emails.
  if (!data.session) return { success: `Check ${email} for a link to confirm your account.` };
  redirect(next);
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const ipOk = await limits.loginByIp.hit(await clientIp());
  if (!ipOk || !await limits.loginByEmail.hit(parsed.data.email)) return { error: TOO_MANY };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: error.code === "email_not_confirmed" ? "Please confirm your email first — check your inbox." : "Incorrect email or password." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const ipOk = await limits.resetByIp.hit(await clientIp());
  if (!ipOk || !await limits.resetByEmail.hit(parsed.data.email)) return { error: TOO_MANY };
  try {
    await sendPasswordResetLink(parsed.data.email, { base: siteUrl(), path: "/reset-password" });
  } catch (e) {
    console.error("[password reset]", e);
    return { error: "We couldn't send the email just now. Please try again in a few minutes." };
  }
  return { success: resetSentMessage(parsed.data.email) };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errs = fieldErrors(parsed.error.issues);
    if (errs.token_hash) return { error: "This link is incomplete. Ask for a new one from the login page." };
    return { fieldErrors: errs };
  }
  if (!await limits.resetByIp.hit(await clientIp())) return { error: TOO_MANY };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: parsed.data.token_hash, type: "recovery" });
  if (error) return { error: "This link has expired or was already used. Ask for a new one." };
  const { error: pwError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (pwError) return { error: pwError.code === "same_password" ? "That's your current password. Choose a different one." : pwError.message };
  redirect("/account?reset=1");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}

// ---------- Wishlist ----------

async function wishlistIds(userId: string): Promise<number[]> {
  const rows = await db
    .select({ productId: schema.wishlistItems.productId })
    .from(schema.wishlistItems)
    .where(eq(schema.wishlistItems.userId, userId));
  return rows.map((r) => r.productId);
}

export async function toggleWishlist(productId: number): Promise<number[]> {
  const user = await getCurrentUser();
  if (!user || !Number.isInteger(productId) || productId <= 0) return [];
  if (!await limits.wishlistByUser.hit(user.id)) return wishlistIds(user.id);
  const product = await db.query.products.findFirst({ where: and(eq(schema.products.id, productId), eq(schema.products.isActive, true)) });
  const where = and(eq(schema.wishlistItems.userId, user.id), eq(schema.wishlistItems.productId, productId));
  const deleted = await db.delete(schema.wishlistItems).where(where).returning();
  if (deleted.length === 0 && product) {
    await db.insert(schema.wishlistItems).values({ userId: user.id, productId }).onConflictDoNothing();
  }
  return wishlistIds(user.id);
}

export async function mergeWishlist(productIds: number[]): Promise<number[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!await limits.wishlistByUser.hit(user.id)) return wishlistIds(user.id);
  const ids = [...new Set(productIds)].filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  if (ids.length) {
    const existing = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(and(inArray(schema.products.id, ids), eq(schema.products.isActive, true)));
    if (existing.length) {
      await db
        .insert(schema.wishlistItems)
        .values(existing.map((p) => ({ userId: user.id, productId: p.id })))
        .onConflictDoNothing();
    }
  }
  return wishlistIds(user.id);
}

export async function fetchProductCards(ids: number[]): Promise<ProductCard[]> {
  if (!await limits.productCardsByIp.hit(await clientIp())) return [];
  const clean = [...new Set(ids)].filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  return getProductCards({ ids: clean });
}

// ---------- Track order ----------

export type TrackState = { error?: string; fieldErrors?: Record<string, string>; order?: TrackedOrder } | undefined;

export async function trackOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const parsed = trackOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const ipOk = await limits.trackByIp.hit(await clientIp());
  if (!ipOk || !await limits.trackByOrder.hit(parsed.data.orderNumber)) return { error: TOO_MANY };
  const order = await findTrackedOrder(parsed.data.orderNumber, parsed.data.contact);
  return order ? { order } : { error: "We couldn't find that order. Check the order number and use the email or WhatsApp number you gave at checkout." };
}

// ---------- Contact form ----------

export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errs = fieldErrors(parsed.error.issues);
    // A filled-in trap field means a bot: pretend it worked.
    if (errs.website) return { success: "Thanks! Your message has been sent." };
    return { fieldErrors: errs };
  }
  const ipOk = await limits.contactByIp.hit(await clientIp());
  if (!ipOk || !await limits.contactByEmail.hit(parsed.data.email)) return { error: TOO_MANY };
  const { website: _, ...m } = parsed.data;
  await db.insert(schema.contactMessages).values(m);
  const adminBase = process.env.ADMIN_URL;
  await sendTelegram(buildContactTelegramMessage(m, adminBase ? `${adminBase}/messages` : undefined)).catch((e) =>
    console.error("[contact notify]", e),
  );
  return { success: "Thanks! Your message has been sent. We'll reply by email soon." };
}
