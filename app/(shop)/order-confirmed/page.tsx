import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import { PayButton } from "@/components/pay-button";
import { getSettings } from "@/lib/settings";
import { getContent } from "@/lib/content";
import { formatINR } from "@/lib/format";
import { checkPayToken } from "@/lib/pay-link";
import { onlinePaymentsEnabled, payView, type PayView } from "@/lib/payments";

export const metadata = { title: "Order placed" };
export const dynamic = "force-dynamic";

export default async function OrderConfirmedPage({ searchParams }: { searchParams: Promise<{ n?: string; t?: string; pay?: string }> }) {
  const { n, t: token, pay } = await searchParams;
  const orderNumber = n && /^PY\d{1,9}$/.test(n) ? n : null;
  const [{ sendOrderEmails }, t] = await Promise.all([getSettings(), getContent()]);
  // Payment details only with the order's pay-link token, so an order number alone reveals nothing.
  const canPay = !!orderNumber && onlinePaymentsEnabled() && checkPayToken(orderNumber, token);
  const view = canPay ? await payView(orderNumber) : null;

  return (
    <div className="container-page max-w-xl py-20 text-center">
      <HeartIcon width={48} height={48} filled className="anim-pop mx-auto text-brand [animation-delay:200ms]" />
      <h1 className="heading-section mt-6">{t("confirmed.title")}</h1>
      {orderNumber && <p className="mt-3 text-lg">Order <strong>{orderNumber}</strong> has been placed.</p>}

      {view && canPay && <PaymentCard view={view} token={token!} autoStart={pay === "1"} />}

      {/* The payment steps only make sense while the order is still waiting for payment. */}
      {(!view || view.status === "pending_payment") && (
        <div className="anim-rise card mt-8 p-6 text-left" style={{ "--delay": "150ms" } as React.CSSProperties}>
          <p className="font-medium">{t("confirmed.next")}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-charcoal/85">
            {sendOrderEmails && <li>{t("confirmed.step1")}</li>}
            <li>{t("confirmed.step2")}</li>
            <li>{t("confirmed.step3")}</li>
          </ol>
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">{t("confirmed.cta")}</Link>
        {orderNumber && <Link href={`/track?n=${orderNumber}`} className="btn-secondary">Track this order</Link>}
      </div>
    </div>
  );
}

function PaymentCard({ view, token, autoStart }: { view: PayView; token: string; autoStart: boolean }) {
  const box = "anim-rise card mt-8 p-6 text-left";
  if (view.status === "cancelled") {
    return (
      <div className={box} role="status">
        <p className="font-medium">This order was cancelled.</p>
        <p className="mt-1 text-sm text-charcoal/80">It wasn&apos;t paid in time, so its items went back on sale. Message us on WhatsApp if you still want them.</p>
      </div>
    );
  }
  if (view.status !== "pending_payment") {
    return (
      <div className={`${box} border-2 border-green-700/30`} role="status">
        <p className="font-medium text-green-800">Payment received: {formatINR(view.total)}</p>
        <p className="mt-1 text-sm text-charcoal/80">Thank you! Your invoice is on its way to your email, and we&apos;ll start packing your candles.</p>
      </div>
    );
  }
  const notCompleted = view.state === "pending" && !autoStart;
  return (
    <div className={box}>
      <p className="font-medium">{notCompleted ? "Your payment wasn't completed" : `Pay ${formatINR(view.total)} to confirm your order`}</p>
      <p className="mb-4 mt-1 text-sm text-charcoal/80">
        {notCompleted
          ? "If money left your account, this page will show it as paid within a few minutes. Otherwise, you can try again."
          : "Pay securely with UPI, cards or net banking. Payments are handled by Cashfree; we never see your card or bank details."}
      </p>
      <PayButton orderNumber={view.orderNumber} token={token} label={`Pay ${formatINR(view.total)}`} autoStart={autoStart} />
    </div>
  );
}
