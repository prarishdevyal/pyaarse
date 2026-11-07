"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PayButton } from "@/components/pay-button";
import { formatINR } from "@/lib/format";
import { formatCountdown } from "@/lib/order-expiry";


/**
 * The payment part of the order page. Before paying (start) and after a failed payment (retry) it counts down to payBy (measured against the server's clock,
 * so a wrong phone clock doesn't matter) and reloads when time runs out; in "processing" it checks again every few seconds.
 */
export function PaymentStatus(props: {
  phase: "start" | "retry" | "processing";
  orderNumber: string;
  token: string;
  total: number;
  payBy: string;
  serverNow: string;
  autoStart: boolean;
}) {
  const router = useRouter();
  const [left, setLeft] = useState(() => Date.parse(props.payBy) - Date.parse(props.serverNow));
  const refreshed = useRef(false);

  useEffect(() => {
    if (props.phase === "processing") {
      const t = setInterval(() => router.refresh(), 5000);
      return () => clearInterval(t);
    }
    // Both before the first try and after a failed one, the customer sees how long the candles stay held.
    const mounted = Date.now();
    const start = Date.parse(props.payBy) - Date.parse(props.serverNow);
    const t = setInterval(() => {
      const ms = start - (Date.now() - mounted);
      setLeft(ms);
      if (ms <= 0 && !refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
    }, 250);
    return () => clearInterval(t);
  }, [props.phase, props.payBy, props.serverNow, router]);

  if (props.phase === "processing") {
    return (
      <div className="card mt-8 p-6" role="status">
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-sand border-t-brand" aria-hidden />
        <p className="mt-4 text-sm text-charcoal/80">This usually takes less than a minute. Please keep this page open and don&apos;t pay again.</p>
      </div>
    );
  }

  const label = `Pay ${formatINR(props.total)}`;
  const urgent = left <= 60_000;
  return (
    <div className="card mt-8 p-6">
      <p className="text-sm text-taupe">Time left to pay</p>
      <p className={`mt-1 font-serif text-5xl tabular-nums ${urgent ? "text-brand" : ""}`} aria-live="off">{formatCountdown(left)}</p>
      <div className="mt-5">
        {left > 0 ? (
          <PayButton orderNumber={props.orderNumber} token={props.token} label={label} autoStart={props.autoStart} />
        ) : (
          <p className="text-sm text-taupe">Checking…</p>
        )}
      </div>
      <p className="mt-4 text-xs text-taupe">
        After that the order is cancelled and the candles go back on sale. Pay with UPI, cards or net banking, handled securely by Cashfree.
      </p>
    </div>
  );
}
