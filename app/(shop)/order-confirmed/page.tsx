import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import { getContent } from "@/lib/content";
import { formatINR } from "@/lib/format";
import { checkPayToken } from "@/lib/pay-link";
import { onlinePaymentsEnabled, payView } from "@/lib/payments";
import { PaymentStatus } from "./payment-status";

export const metadata = { title: "Your order" };
export const dynamic = "force-dynamic";

const HEADINGS = {
  start: "Complete your payment",
  retry: "Payment not completed",
  processing: "Checking your payment…",
  cancelled: "Order cancelled",
} as const;

export default async function OrderConfirmedPage({ searchParams }: { searchParams: Promise<{ n?: string; t?: string; pay?: string }> }) {
  const { n, t: token, pay } = await searchParams;
  const orderNumber = n && /^PY\d{1,9}$/.test(n) ? n : null;
  const t = await getContent();
  // Order details only with the order's pay-link token, so an order number alone reveals nothing.
  const view = orderNumber && onlinePaymentsEnabled() && checkPayToken(orderNumber, token) ? await payView(orderNumber) : null;

  const actions = (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Link href="/shop" className={view?.phase === "paid" || !view || view.phase === "cancelled" ? "btn-primary" : "btn-secondary"}>
        {view?.phase === "cancelled" ? "Shop again" : t("confirmed.cta")}
      </Link>
      {orderNumber && view?.phase !== "cancelled" && <Link href={`/track?n=${orderNumber}`} className="btn-secondary">Track this order</Link>}
    </div>
  );

  if (!view) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <h1 className="heading-section">{orderNumber ? `Order ${orderNumber}` : "Your order"}</h1>
        <p className="mt-3 text-charcoal/80">Check its status any time on the Track page, with the email or phone number you used at checkout.</p>
        {actions}
      </div>
    );
  }

  if (view.phase === "paid") {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <HeartIcon width={48} height={48} filled className="anim-pop mx-auto text-brand [animation-delay:200ms]" />
        <h1 className="heading-section mt-6">{t("confirmed.title")}</h1>
        <p className="mt-3 text-lg">Order <strong>{view.orderNumber}</strong> is confirmed.</p>
        <div className="anim-rise card mt-8 border-2 border-green-700/30 p-6 text-left" role="status">
          <p className="font-medium text-green-800">Payment received: {formatINR(view.total)}</p>
          <p className="mt-1 text-sm text-charcoal/80">
            We&apos;ve emailed your invoice to {view.email}. We&apos;ll pack your candles with care and send you the tracking details once they ship.
          </p>
        </div>
        {actions}
      </div>
    );
  }

  if (view.phase === "cancelled") {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <h1 className="heading-section">{HEADINGS.cancelled}</h1>
        <p className="mt-3 text-charcoal/80">
          Order <strong>{view.orderNumber}</strong> was cancelled, so its candles went back on sale. Unpaid orders are cancelled when the time to pay runs out.
          If money left your account, contact us and we&apos;ll sort it out.
        </p>
        {actions}
      </div>
    );
  }

  return (
    <div className="container-page max-w-xl py-20 text-center">
      <h1 className="heading-section">{HEADINGS[view.phase]}</h1>
      <p className="mt-3 text-charcoal/80">
        {view.phase === "retry" ? (
          <>The payment for order <strong>{view.orderNumber}</strong> didn&apos;t go through. If money left your account, this page will show it as paid within a few minutes. Otherwise, try again:</>
        ) : view.phase === "processing" ? (
          <>Order <strong>{view.orderNumber}</strong> · {formatINR(view.total)}</>
        ) : (
          <>Order <strong>{view.orderNumber}</strong> is placed once it&apos;s paid. We&apos;re holding your candles while you pay.</>
        )}
      </p>
      <PaymentStatus
        phase={view.phase}
        orderNumber={view.orderNumber}
        token={token!}
        total={view.total}
        payBy={view.payBy}
        serverNow={new Date().toISOString()}
        autoStart={view.phase === "start" && pay === "1"}
      />
    </div>
  );
}
