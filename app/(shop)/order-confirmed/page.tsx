import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { getContent } from "@/lib/content";

export const metadata = { title: "Order placed" };

export default async function OrderConfirmedPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const orderNumber = n && /^PY\d+$/.test(n) ? n : null;
  const [{ sendOrderEmails }, t] = await Promise.all([getSettings(), getContent()]);
  return (
    <div className="container-page max-w-xl py-20 text-center">
      <HeartIcon width={48} height={48} filled className="anim-pop mx-auto text-brand [animation-delay:200ms]" />
      <h1 className="heading-section mt-6">{t("confirmed.title")}</h1>
      {orderNumber && <p className="mt-3 text-lg">Order <strong>{orderNumber}</strong> has been placed.</p>}
      <div className="anim-rise card mt-8 p-6 text-left" style={{ "--delay": "150ms" } as React.CSSProperties}>
        <p className="font-medium">What happens next?</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-charcoal/85">
          {sendOrderEmails && <li>We&apos;ve emailed you an order confirmation.</li>}
          <li>We&apos;ll message you on WhatsApp with a UPI payment QR code.</li>
          <li>Once payment is received, we&apos;ll lovingly pack and ship your candles.</li>
        </ol>
      </div>
      <Link href="/shop" className="btn-primary mt-8">Continue shopping</Link>
    </div>
  );
}
