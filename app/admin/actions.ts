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
import { canChangeStatus, isOrderStatus, shouldRestock } from "@/lib/order-status";
import { saveSettings as storeSettings } from "@/lib/settings";
import { restockOrders } from "@/lib/orders";
import { saveImage } from "@/lib/uploads";
import { loginSchema, settingsSchema, variantProblems } from "@/lib/validation";
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

  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!order || !canChangeStatus(order.status, to)) return;
    if (shouldRestock(order.status, to)) await restockOrders(tx, [id]);
    await tx.update(orders).set({ status: to }).where(eq(orders.id, id));
  });
  redirect(`/orders/${id}`);
}

// ---------- Products ----------

const variantSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "Variant name is required"),
  price: z.number().int().min(0, "Price can't be negative"),
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
      const row = { name: v.name, price: v.price, stock: v.stock, sortOrder };
      if (v.id) {
        await tx.update(productVariants).set(row).where(and(eq(productVariants.id, v.id), eq(productVariants.productId, productId!)));
      } else {
        await tx.insert(productVariants).values({ ...row, productId: productId! });
      }
    }
  });
  redirect("/products");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await db.delete(products).where(eq(products.id, id));
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
  const shippingFee = Number(parsed.data.shippingFee);
  const freeShippingThreshold = Number(parsed.data.freeShippingThreshold);
  const sendOrderEmails = formData.get("sendOrderEmails") === "on";
  await storeSettings({ shippingFee, freeShippingThreshold, sendOrderEmails });
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
