import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { buildPasswordResetEmail, sendEmail } from "./notify/email";

/**
 * Emails a one-time "choose a new password" link that works on any device (our own page verifies it).
 * Says nothing about whether the account exists: unknown emails (or non-admins, for the admin form) get no email.
 */
export async function sendPasswordResetLink(email: string, opts: { base: string; path: string; adminOnly?: boolean }): Promise<void> {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.user) return;
  if (opts.adminOnly && data.user.app_metadata?.role !== "admin") return;
  const link = `${opts.base.replace(/\/+$/, "")}${opts.path}?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`;
  await sendEmail(email, buildPasswordResetEmail(link, opts.adminOnly));
}

/** The same reply whether or not the account exists, so the form can't be used to find out who has one. */
export const resetSentMessage = (email: string) =>
  `If ${email} has an account, we've emailed it a link to choose a new password. Check your inbox (and spam folder).`;
