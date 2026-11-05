import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { emailProvider } from "@/lib/notify/email";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

const PROVIDER_LABEL = {
  resend: "Resend",
  smtp: `SMTP (${process.env.SMTP_HOST})`,
  none: "Not configured — emails are only logged",
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  const provider = emailProvider();
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-serif text-4xl text-brand">Settings</h1>
      <SettingsForm initial={settings} />
      <section className="card bg-white p-5 text-sm">
        <h2 className="mb-2 font-serif text-2xl">Notifications</h2>
        <p>Telegram alerts: <strong>{process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? "Connected" : "Not configured"}</strong></p>
        <p>Email provider: <strong>{provider === "smtp" ? PROVIDER_LABEL.smtp : PROVIDER_LABEL[provider]}</strong></p>
        <p className="mt-2 text-xs text-taupe">These come from the server&apos;s environment variables (.env). Add RESEND_API_KEY to send real emails.</p>
      </section>
    </div>
  );
}
