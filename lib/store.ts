export type StoreContactOverrides = { email?: string; whatsapp?: string; instagram?: string };

/** Shop contact details: admin overrides (Settings), else env (STORE_*), else the shop's real details. */
export function storeContact(env: Record<string, string | undefined> = process.env, overrides: StoreContactOverrides = {}) {
  const whatsapp = (overrides.whatsapp || env.STORE_WHATSAPP || "").replace(/\D/g, "");
  return {
    whatsapp,
    email: overrides.email || env.STORE_EMAIL || "query@pyaarse.net",
    instagram: instagramHandle(overrides.instagram || env.STORE_INSTAGRAM || "pyaarse_net"),
    /** wa.me chat link with a pre-filled message, or null when no number is set. */
    whatsappLink: (message: string) => (whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : null),
  };
}

/** Accepts "@handle", "handle" or a full instagram.com link and returns just the handle. */
export function instagramHandle(raw: string): string {
  return raw.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
}

export type StoreContact = ReturnType<typeof storeContact>;
