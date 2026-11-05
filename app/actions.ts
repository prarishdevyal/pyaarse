"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductCards, type ProductCard } from "@/lib/catalog";
import { placeOrder } from "@/lib/orders";
import { priceCart, type CartLine } from "@/lib/pricing";
import { getShippingSettings } from "@/lib/settings";
import { cartItemsSchema, checkoutSchema, contactSchema, loginSchema, registerSchema } from "@/lib/validation";
import { buildContactTelegramMessage, sendTelegram } from "@/lib/notify/telegram";
import { safeNext } from "@/lib/redirect";
import { siteUrl } from "@/lib/hosts";
import { clientIp, limits, TOO_MANY } from "@/lib/limits";

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

export async function quoteCart(input: CartLine[]) {
  const settings = await getShippingSettings();
  const parsed = cartItemsSchema.safeParse(input);
  if (!parsed.success) return { quote: { ok: false as const, error: "Your cart could not be read. Please refresh." }, settings, variants: [] };
  if (!await limits.quoteByIp.hit(await clientIp())) return { quote: { ok: false as const, error: TOO_MANY }, settings, variants: [] };
  const lines = parsed.data;
  const ids = lines.map((l) => l.variantId);
  if (ids.length === 0) return { quote: priceCart([], [], settings), settings, variants: [] };
  const rows = await db
    .select({
      id: schema.productVariants.id,
      productId: schema.productVariants.productId,
      productName: schema.products.name,
      variantName: schema.productVariants.name,
      price: schema.productVariants.price,
      stock: schema.productVariants.stock,
      isActive: schema.products.isActive,
    })
    .from(schema.productVariants)
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(and(inArray(schema.productVariants.id, ids), eq(schema.products.isActive, true)));
  // Only what the cart UI needs, and never anything about hidden products.
  const variants = rows.map(({ id, price, stock }) => ({ id, price, stock }));
  return { quote: priceCart(lines, rows, settings), settings, variants };
}

export async function checkout(
  input: unknown,
): Promise<{ ok: true; orderNumber: string } | { ok: false; error?: string; fieldErrors?: Record<string, string> }> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error.issues) };
  const ipOk = await limits.checkoutByIp.hit(await clientIp());
  if (!ipOk || !await limits.checkoutByEmail.hit(parsed.data.email)) return { ok: false, error: TOO_MANY };
  const user = await getCurrentUser();
  const result = await placeOrder(parsed.data, user?.id ?? null);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, orderNumber: result.orderNumber };
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
  const ids = [...new Set(productIds)].filter((n) => Number.isInteger(n) && n > 0);
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
  const clean = [...new Set(ids)].filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  return getProductCards({ ids: clean });
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
