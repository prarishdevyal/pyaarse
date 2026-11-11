import { z } from "zod";
import { packageProblem, type PackageInfo } from "./package";
import { MAX_CART_LINES, MAX_QTY_PER_VARIANT } from "./pricing";
import { isIndianState } from "./india";
import { MIN_ADMIN_PASSWORD_LENGTH } from "./admin-bootstrap";

/** Single-line text: collapses newlines/tabs so customers can't add fake lines to emails or alerts. */
const line = (min: number, max: number, msg: string) =>
  z.string().transform((v) => v.replace(/\s+/g, " ").trim()).pipe(z.string().min(min, msg).max(max));

const cartItems = z
  .array(z.object({ variantId: z.number().int().positive(), quantity: z.number().int().min(1).max(MAX_QTY_PER_VARIANT) }))
  .max(MAX_CART_LINES, "Too many items in cart.");
const noDuplicates = (a: { variantId: number }[]) => new Set(a.map((i) => i.variantId)).size === a.length;

export const cartItemsSchema = cartItems.refine(noDuplicates, "Duplicate items in cart.");

export const checkoutSchema = z.object({
  customerName: line(2, 100, "Please enter your name"),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email")),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+91|91|0)?[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number")),
  addressLine: line(5, 300, "Please enter your full address"),
  city: line(2, 80, "Please enter your city"),
  state: z.string().trim().refine(isIndianState, "Please choose your state"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  notes: z.string().trim().max(500).default(""),
  couponCode: z.string().trim().max(30).optional().default(""),
  items: cartItems.min(1, "Your cart is empty.").refine(noDuplicates, "Duplicate items in cart."),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Checkout fields the customer types (everything except the cart), for live validation in the browser. */
export const checkoutFieldsShape = checkoutSchema.omit({ items: true }).shape;

export const registerSchema = z.object({
  name: line(2, 100, "Please enter your name"),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email")),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email")),
  password: z.string().min(1, "Please enter your password").max(200),
});

export const contactSchema = z.object({
  name: line(2, 100, "Please enter your name"),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email")),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^(\+91|91|0)?[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number")]))
    .default(""),
  message: z.string().trim().min(10, "Please write a little more (at least 10 characters)").max(2000, "Please keep it under 2000 characters"),
  // Hidden from people; bots tend to fill it in.
  website: z.string().max(0).optional().default(""),
});

const rupees = (label: string) => z.string().trim().regex(/^\d{1,7}$/, `${label} must be a whole rupee amount (0 or more)`);

export const settingsSchema = z.object({
  shippingFee: rupees("Shipping fee"),
  freeShippingThreshold: rupees("Free-shipping amount"),
  contactEmail: z.string().trim().toLowerCase().pipe(z.union([z.literal(""), z.email("Please enter a valid email")])).default(""),
  contactWhatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^(\+91|91|0)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number")]))
    .transform((v) => (v ? `91${v.replace(/\D/g, "").slice(-10)}` : ""))
    .default(""),
  contactInstagram: z
    .string()
    .transform((v) => v.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "Use the Instagram username, e.g. pyaarse_net")]))
    .default(""),
});

export const collectionFieldsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  tagline: z.string().trim().max(200, "Keep the tagline under 200 characters"),
  sortOrder: z.string().trim().regex(/^-?\d{1,4}$/, "Order must be a whole number"),
});

export const productFieldsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(150),
  description: z.string().trim().max(5000, "Keep the description under 5000 characters"),
});

/** Problems with the variant rows, keyed by row index (empty = all fine). */
export function variantProblems(
  variants: ({ name: string; subName?: string; price: number; salePrice?: number | null; stock: number } & Partial<PackageInfo>)[],
): Record<number, string> {
  const out: Record<number, string> = {};
  variants.forEach((v, i) => {
    if (!v.name.trim()) out[i] = "Give this variant a name, e.g. 200g.";
    else if (!Number.isInteger(v.price) || v.price < 1) out[i] = "Price must be at least ₹1.";
    else if (v.salePrice != null && (!Number.isInteger(v.salePrice) || v.salePrice < 1 || v.salePrice >= v.price)) out[i] = "Sale price must be lower than the price.";
    else if (!Number.isInteger(v.stock) || v.stock < 0) out[i] = "Stock can't be negative.";
    else {
      const pkg = packageProblem({ weightGrams: v.weightGrams ?? null, lengthCm: v.lengthCm ?? null, widthCm: v.widthCm ?? null, heightCm: v.heightCm ?? null });
      if (pkg) out[i] = pkg;
    }
  });
  // A variant name used more than once must split into named sub-variants (e.g. Box of 4 · Rose, Box of 4 · Oud).
  const name = (v: (typeof variants)[number]) => v.name.trim().toLowerCase();
  const sub = (v: (typeof variants)[number]) => (v.subName ?? "").trim().toLowerCase();
  variants.forEach((v, i) => {
    if (out[i] || !name(v)) return;
    const group = variants.filter((w) => name(w) === name(v));
    const shared = group.length > 1;
    const usesSubs = group.some((w) => sub(w));
    if (shared && !sub(v) && usesSubs) out[i] = `"${v.name.trim()}" has sub-variants, so give this one a sub-variant name, e.g. Rose.`;
    else if (variants.findIndex((w) => name(w) === name(v) && sub(w) === sub(v)) !== i) out[i] = usesSubs ? "Two sub-variants have the same name." : "Two variants have the same name.";
  });
  return out;
}

export const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email")),
});

export const setAdminPasswordSchema = z
  .object({
    password: z
      .string()
      .min(MIN_ADMIN_PASSWORD_LENGTH, `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`)
      .max(72, "Password must be at most 72 characters"),
    confirm: z.string(),
    token_hash: z.string().min(10, "This link is incomplete. Ask for a new invite."),
    type: z.enum(["invite", "recovery"]),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match" });

// A box that may be left empty, or not be on the form at all (e.g. "Max discount" is hidden for rupees-off coupons).
const optionalWhole = (msg: string) =>
  z.string().trim().default("").refine((v) => v === "" || /^\d{1,7}$/.test(v), msg).transform((v) => (v === "" ? null : Number(v)));

export const couponSchema = z
  .object({
    code: z
      .string()
      .transform((v) => v.trim().toUpperCase().replace(/\s+/g, ""))
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,20}$/, "Use 3–20 letters or numbers, e.g. DIWALI10")),
    kind: z.enum(["percent", "flat"]),
    value: z.string().trim().regex(/^\d{1,6}$/, "Enter a whole number").transform(Number).pipe(z.number().min(1, "Enter at least 1")),
    minSubtotal: optionalWhole("Minimum order must be a whole rupee amount").transform((v) => v ?? 0),
    maxDiscount: optionalWhole("Max discount must be a whole rupee amount"),
    usageLimit: optionalWhole("Usage limit must be a whole number"),
    expiresOn: z.string().trim().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date"),
  })
  .refine((c) => c.kind !== "percent" || c.value <= 90, { path: ["value"], message: "Percent off can be at most 90" })
  .refine((c) => c.usageLimit === null || c.usageLimit >= 1, { path: ["usageLimit"], message: "Leave empty for unlimited, or enter at least 1" });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email")),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
    confirm: z.string(),
    token_hash: z.string().min(10, "This link is incomplete. Ask for a new one."),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match" });

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().pipe(z.string().regex(/^PY\d{1,9}$/, "Enter your order number, e.g. PY1042")),
  contact: z.string().trim().min(5, "Enter the email or WhatsApp number you used at checkout").max(200),
});
