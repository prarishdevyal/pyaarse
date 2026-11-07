import { HeartIcon } from "@/components/icons";
import type { storeContact } from "@/lib/store";

/** What shoppers see while the admin has maintenance mode on. */
export function MaintenancePage({ contact }: { contact: ReturnType<typeof storeContact> }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/pyaarse-logo-horizontal.svg" alt="Pyaarse" className="mx-auto h-10 w-auto" />
        <HeartIcon width={40} height={40} filled className="mx-auto mt-10 text-brand" />
        <h1 className="heading-section mt-6">We&apos;ll be back soon</h1>
        <p className="mt-3 text-charcoal/80">
          The shop is closed for a short while for maintenance. Your candles are safe with us, so please check back in a little while.
        </p>
        <p className="mt-6 text-sm text-taupe">
          Questions about an order? Email <a href={`mailto:${contact.email}`} className="text-brand underline underline-offset-4">{contact.email}</a>
        </p>
      </div>
    </main>
  );
}
