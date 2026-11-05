/** Shop contact details from env (STORE_*). */
export function storeContact(env: Record<string, string | undefined> = process.env) {
  const whatsapp = (env.STORE_WHATSAPP ?? "").replace(/\D/g, "");
  return {
    whatsapp,
    email: env.STORE_EMAIL || "hello@pyaarse.net",
    instagram: (env.STORE_INSTAGRAM || "pyaarse").replace(/^@/, ""),
    /** wa.me chat link with a pre-filled message, or null when no number is set. */
    whatsappLink: (message: string) => (whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : null),
  };
}
