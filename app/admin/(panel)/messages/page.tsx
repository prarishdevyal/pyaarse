import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { toWhatsAppNumber, formatDateTime } from "@/lib/format";
import { markMessageRead } from "../../actions";

export const metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  await requireAdmin();
  const messages = await db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.createdAt)).limit(200);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-brand">Messages</h1>
      {messages.length === 0 ? (
        <p className="py-8 text-center text-taupe">No messages yet. They&apos;ll appear here when someone uses the contact form.</p>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id} className={`card bg-white p-5 ${m.isRead ? "opacity-70" : "border-brand/40"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-medium">
                  {!m.isRead && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" title="Unread" />}
                  {m.name}
                </p>
                <p className="text-xs text-taupe">{formatDateTime(m.createdAt)}</p>
              </div>
              <p className="mt-1 text-sm text-taupe">
                {m.email}
                {m.phone && ` · ${m.phone}`}
              </p>
              <p className="mt-3 whitespace-pre-line">{m.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Pyaarse")}`} className="btn-secondary px-4 py-1.5">Reply by email</a>
                {m.phone && (
                  <a href={`https://wa.me/${toWhatsAppNumber(m.phone)}`} target="_blank" rel="noreferrer" className="btn-secondary px-4 py-1.5">WhatsApp</a>
                )}
                {!m.isRead && (
                  <form action={markMessageRead}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="text-taupe underline hover:text-brand">Mark as read</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
