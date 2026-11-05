"use server";

import { and, eq, ne, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { userFromClaims } from "@/lib/auth-claims";
import { isAllowedImageUrl } from "@/lib/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientIp, limits, TOO_MANY } from "@/lib/limits";
import { slugify } from "@/lib/format";
import { expiryFromDate, toStoredPrices } from "@/lib/discounts";
import { canChangeStatus, isOrderStatus, shouldRestock } from "@/lib/order-status";
import { saveSettings as storeSettings } from "@/lib/settings";
import { restockOrders, sendInvoice } from "@/lib/orders";
import { removeImages, saveImage } from "@/lib/uploads";
import { couponSchema, forgotPasswordSchema, inviteAdminSchema, loginSchema, setAdminPasswordSchema, settingsSchema, variantProblems } from "@/lib/validation";
import { inviteAdmin, setUserRole } from "@/lib/users";
import { resetSentMessage, sendPasswordResetLink } from "@/lib/password-reset";
import { cleanContentEdits } from "@/lib/content-defaults";
import { inArray } from "drizzle-orm";
import type { FormState } from "@/app/actions";

const { products, productVariants, collections, orders } = schema;

// ---------- Auth ----------

export async function adminLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please enter your email and password." };
  const ipOk = await limits.adminLoginByIp.hit(await clientIp());
  if (!ipOk || !await limits.adminLoginByEmail.hit(parsed.data.email)) return { error: TOO_MANY };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  const user = data.session ? userFromClaims({ sub: data.user?.id, email: data.user?.email, app_metadata: data.user?.app_metadata }) : null;
  if (error || user?.role !== "admin") {
    // Customers can't hold a session on the admin host.
    if (data.session) await supabase.auth.signOut({ scope: "local" });
    return { error: "Incorrect email or password." };
  }
  redirect("/");
}

/** Invite link landing: verifies the emailed token, sets the password, signs in to the admin. */
export async function completeAdminInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = setAdminPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errs: Record<string, string> = {};
    for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (errs.token_hash || errs.type) return { error: "This link is incomplete. Ask an admin to send a new invite." };
    return { fieldErrors: errs };
  }
  if (!await limits.adminLoginByIp.hit(await clientIp())) return { error: TOO_MANY };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: parsed.data.token_hash, type: parsed.data.type });
  if (error || !data.user) return { error: "This link has expired or was already used. Use “Forgot password?” on the sign-in page, or ask an admin for a new invite." };
  if (data.user.app_metadata?.role !== "admin") {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "This account doesn't have admin access." };
  }
  const { error: pwError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (pwError) return { error: pwError.message };
  redirect("/");
}

/** Admin "forgot password": emails a link to the admin set-password page, only for admin accounts. */
export async function adminRequestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };
  const ipOk = await limits.resetByIp.hit(await clientIp());
  if (!ipOk || !await limits.resetByEmail.hit(parsed.data.email)) return { error: TOO_MANY };
  const base = process.env.ADMIN_URL;
  if (!base) return { error: "ADMIN_URL is not set on the server." };
  try {
    await sendPasswordResetLink(parsed.data.email, { base, path: "/set-password", adminOnly: true });
  } catch (e) {
    console.error("[admin password reset]", e);
    return { error: "We couldn't send the email just now. Please try again in a few minutes." };
  }
  return { success: resetSentMessage(parsed.data.email) };
}

export async function adminLogout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

// ---------- Orders ----------

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const to = formData.get("status");
  if (!Number.isInteger(id) || !isOrderStatus(to)) return;

  const from = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!order || !canChangeStatus(order.status, to)) return null;
    if (shouldRestock(order.status, to)) await restockOrders(tx, [id]);
    await tx.update(orders).set({ status: to }).where(eq(orders.id, id));
    return order.status;
  });
  // Approving payment sends the customer their invoice.
  if (from === "pending_payment" && to === "paid") redirect(invoiceResultUrl(id, await sendInvoice(id)));
  redirect(`/orders/${id}`);
}

export async function resendInvoice(formData: FormData) {
  const actor = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  if (!await limits.adminEmailsByUser.hit(actor.id)) redirect(invoiceResultUrl(id, { ok: false, error: TOO_MANY }));
  redirect(invoiceResultUrl(id, await sendInvoice(id)));
}

function invoiceResultUrl(id: number, r: Awaited<ReturnType<typeof sendInvoice>>): string {
  return r.ok ? `/orders/${id}?invoice=sent` : `/orders/${id}?invoice=failed&reason=${encodeURIComponent(r.error.slice(0, 200))}`;
}

// ---------- Users ----------

export async function inviteAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const parsed = inviteAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };
  if (!await limits.adminEmailsByUser.hit(actor.id)) return { error: TOO_MANY };
  try {
    const r = await inviteAdmin(actor, parsed.data.email);
    return r.ok ? { success: r.message } : { error: r.error };
  } catch (e) {
    console.error("[invite admin]", e);
    return { error: `Couldn't send the invite: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function changeUserRole(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const makeAdmin = formData.get("role") === "admin";
  const r = await setUserRole(actor, id, makeAdmin).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
  redirect(r.ok ? `/users?ok=${encodeURIComponent(r.message)}` : `/users?error=${encodeURIComponent(r.error)}`);
}

// ---------- Coupons ----------

export async function createCoupon(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errs: Record<string, string> = {};
    for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    return { fieldErrors: errs };
  }
  const { expiresOn, ...c } = parsed.data;
  const exists = await db.query.coupons.findFirst({ where: eq(schema.coupons.code, c.code) });
  if (exists) return { fieldErrors: { code: `${c.code} already exists.` } };
  await db.insert(schema.coupons).values({ ...c, maxDiscount: c.kind === "percent" ? c.maxDiscount : null, expiresAt: expiryFromDate(expiresOn) });
  return { success: `${c.code} created.` };
}

export async function setCouponActive(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await db.update(schema.coupons).set({ isActive: formData.get("active") === "true" }).where(eq(schema.coupons.id, id));
  redirect("/coupons");
}

export async function deleteCoupon(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  // Orders keep the code as text, so deleting a coupon doesn't change past orders.
  if (Number.isInteger(id)) await db.delete(schema.coupons).where(eq(schema.coupons.id, id));
  redirect("/coupons");
}

// ---------- Products ----------

const variantSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "Variant name is required"),
  price: z.number().int().min(0, "Price can't be negative"),
  salePrice: z.number().int().min(1).nullable().optional().default(null),
  stock: z.number().int().min(0, "Stock can't be negative"),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  slug: z.string().trim(),
  description: z.string().trim().default(""),
  collectionId: z.string().transform((v) => (v ? Number(v) : null)),
  isBestseller: z.boolean(),
  isActive: z.boolean(),
  variants: z.array(variantSchema).min(1, "Add at least one variant"),
  keepImages: z.array(z.string().refine((u) => isAllowedImageUrl(u, process.env.SUPABASE_URL), "Invalid image")),
});

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = formData.get("id") ? Number(formData.get("id")) : null;

  let parsed;
  try {
    parsed = productSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug") ?? "",
      description: formData.get("description") ?? "",
      collectionId: formData.get("collectionId") ?? "",
      isBestseller: formData.get("isBestseller") === "on",
      isActive: formData.get("isActive") === "on",
      variants: JSON.parse(String(formData.get("variants") ?? "[]")),
      keepImages: JSON.parse(String(formData.get("keepImages") ?? "[]")),
    });
  } catch {
    return { error: "Invalid form data." };
  }
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const badVariant = Object.values(variantProblems(data.variants))[0];
  if (badVariant) return { error: badVariant };
  const slug = slugify(data.slug || data.name);
  if (!slug) return { error: "Please enter a valid URL slug." };

  const clash = await db.query.products.findFirst({
    where: id ? and(eq(products.slug, slug), ne(products.id, id)) : eq(products.slug, slug),
  });
  if (clash) return { error: `Another product already uses the URL "${slug}".` };

  const newFiles = formData.getAll("newImages").filter((f): f is File => f instanceof File && f.size > 0);
  let uploaded: string[];
  try {
    uploaded = await Promise.all(newFiles.map(saveImage));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const values = {
    name: data.name,
    slug,
    description: data.description,
    collectionId: data.collectionId,
    isBestseller: data.isBestseller,
    isActive: data.isActive,
    images: [...data.keepImages, ...uploaded],
  };

  await db.transaction(async (tx) => {
    let productId = id;
    if (productId) {
      await tx.update(products).set(values).where(eq(products.id, productId));
    } else {
      [{ id: productId }] = await tx.insert(products).values(values).returning({ id: products.id });
    }
    const keepIds = data.variants.flatMap((v) => (v.id ? [v.id] : []));
    await tx
      .delete(productVariants)
      .where(and(eq(productVariants.productId, productId!), keepIds.length ? notInArray(productVariants.id, keepIds) : undefined));
    for (const [sortOrder, v] of data.variants.entries()) {
      const row = { name: v.name, ...toStoredPrices(v.price, v.salePrice), stock: v.stock, sortOrder };
      if (v.id) {
        await tx.update(productVariants).set(row).where(and(eq(productVariants.id, v.id), eq(productVariants.productId, productId!)));
      } else {
        await tx.insert(productVariants).values({ ...row, productId: productId! });
      }
    }
  });
  redirect("/products");
}

/** Removes a product, its variants and its photos. Past orders keep their own copy of names and prices. */
export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/products");
  const [gone] = await db.delete(products).where(eq(products.id, id)).returning({ name: products.name, images: products.images });
  if (gone) {
    const stillUsed = new Set((await db.select({ images: products.images }).from(products)).flatMap((p) => p.images));
    await removeImages(gone.images.filter((u) => !stillUsed.has(u)));
  }
  redirect(gone ? `/products?deleted=${encodeURIComponent(gone.name)}` : "/products");
}

export async function setProductVisible(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await db.update(products).set({ isActive: formData.get("visible") === "true" }).where(eq(products.id, id));
  redirect("/products");
}

// ---------- Collections ----------

export async function saveCollection(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  if (name.length < 2) return { error: "Name is required." };
  const slug = slugify(String(formData.get("slug") || name));

  const clash = await db.query.collections.findFirst({
    where: id ? and(eq(collections.slug, slug), ne(collections.id, id)) : eq(collections.slug, slug),
  });
  if (clash) return { error: `Another collection already uses "${slug}".` };

  const file = formData.get("image");
  let image: string | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      image = await saveImage(file);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  const values = { name, slug, tagline, sortOrder, ...(image ? { image } : {}) };
  if (id) await db.update(collections).set(values).where(eq(collections.id, id));
  else await db.insert(collections).values(values);
  redirect("/collections");
}

export async function deleteCollection(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await db.delete(collections).where(eq(collections.id, id));
  redirect("/collections");
}

// ---------- Settings ----------

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { contactEmail, contactWhatsapp, contactInstagram } = parsed.data;
  const shippingFee = Number(parsed.data.shippingFee);
  const freeShippingThreshold = Number(parsed.data.freeShippingThreshold);
  const sendOrderEmails = formData.get("sendOrderEmails") === "on";
  await storeSettings({ shippingFee, freeShippingThreshold, sendOrderEmails, contactEmail, contactWhatsapp, contactInstagram });
  return { success: "Settings saved." };
}

// ---------- Site text ----------

export async function saveContent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { set, clear, errors } = cleanContentEdits(Object.fromEntries(formData));
  if (errors.length) return { error: errors.join(" ") };
  await db.transaction(async (tx) => {
    if (clear.length) await tx.delete(schema.siteContent).where(inArray(schema.siteContent.key, clear));
    for (const [key, value] of Object.entries(set)) {
      await tx
        .insert(schema.siteContent)
        .values({ key, value })
        .onConflictDoUpdate({ target: schema.siteContent.key, set: { value, updatedAt: new Date() } });
    }
  });
  return { success: "Saved. The changes are live on the site." };
}

// ---------- Messages ----------

export async function markMessageRead(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await db.update(schema.contactMessages).set({ isRead: true }).where(eq(schema.contactMessages.id, id));
  redirect("/messages");
}
