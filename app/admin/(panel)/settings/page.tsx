import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { emailProvider } from "@/lib/notify/email";
import { SettingsForm } from "./settings-form";
import { toggleMaintenance } from "../../actions";

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
      <form action={toggleMaintenance} className={`card space-y-3 p-5 ${settings.maintenance ? "border-2 border-brand bg-blush" : "bg-white"}`}>
        <input type="hidden" name="on" value={settings.maintenance ? "false" : "true"} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">Maintenance mode</h2>
            <p className="mt-1 text-sm">
              {settings.maintenance ? <strong className="text-brand">On: the shop is closed to customers.</strong> : "Off: the shop is open."}
            </p>
          </div>
        </div>
        <p className="text-xs text-taupe">
          While it&apos;s on, shoppers see a &ldquo;We&apos;ll be back soon&rdquo; page and nobody can place an order or pay. The admin keeps working, and payments already made are still recorded.
        </p>
        <button className={settings.maintenance ? "btn-primary" : "btn-secondary"}>
          {settings.maintenance ? "Turn off and open the shop" : "Turn on and close the shop"}
        </button>
      </form>
      <SettingsForm initial={settings} />
      <section className="card bg-white p-5 text-sm">
        <h2 className="mb-2 font-serif text-2xl">Notifications</h2>
        <p>Telegram alerts: <strong>{process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? "Connected" : "Not configured"}</strong></p>
        <p>Email provider: <strong>{provider === "smtp" ? PROVIDER_LABEL.smtp : PROVIDER_LABEL[provider]}</strong></p>
        <p className="mt-2 text-xs text-taupe">These come from the server&apos;s environment variables (.env). Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to send real emails.</p>
      </section>
    </div>
  );
}
