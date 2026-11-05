/** Shop contact details from env (STORE_*), with the shop's real details as defaults. */
export function storeContact(env: Record<string, string | undefined> = process.env) {
  const whatsapp = (env.STORE_WHATSAPP ?? "").replace(/\D/g, "");
  return {
    whatsapp,
    email: env.STORE_EMAIL || "query@pyaarse.net",
    instagram: instagramHandle(env.STORE_INSTAGRAM || "pyaarse_net"),
    /** wa.me chat link with a pre-filled message, or null when no number is set. */
    whatsappLink: (message: string) => (whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : null),
  };
}

/** Accepts "@handle", "handle" or a full instagram.com link and returns just the handle. */
export function instagramHandle(raw: string): string {
  return raw.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
}
