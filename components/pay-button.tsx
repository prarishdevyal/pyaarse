"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payForOrder } from "@/app/actions";

const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

type CashfreeSdk = (opts: { mode: "sandbox" | "production" }) => {
  checkout: (opts: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<{ error?: { message?: string } } | undefined>;
};

let sdk: Promise<CashfreeSdk> | null = null;
/** Loads Cashfree's script once. Call it early (e.g. on the checkout page) so the jump to payment is quick. */
export function loadSdk(): Promise<CashfreeSdk> {
  sdk ??= new Promise<CashfreeSdk>((resolve, reject) => {
    const w = window as unknown as { Cashfree?: CashfreeSdk };
    if (w.Cashfree) return resolve(w.Cashfree);
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => (w.Cashfree ? resolve(w.Cashfree) : reject(new Error("Cashfree didn't load")));
    s.onerror = () => reject(new Error("Cashfree didn't load"));
    document.head.appendChild(s);
  }).catch((e) => {
    sdk = null;
    throw e;
  });
  return sdk;
}

export type OpenPaymentResult = { ok: true } | { ok: false; error: string; paid?: boolean; closed?: boolean };

/**
 * Sends the customer to Cashfree's payment page for an unpaid order. On success the browser leaves the site;
 * otherwise it says why. The amount comes from the order on the server, never from the browser.
 */
export async function openPayment(orderNumber: string, token: string): Promise<OpenPaymentResult> {
  const res = await payForOrder(orderNumber, token);
  if (!res.ok) return res;
  try {
    const cashfree = (await loadSdk())({ mode: res.mode });
    const result = await cashfree.checkout({ paymentSessionId: res.sessionId, redirectTarget: "_self" });
    if (result?.error) return { ok: false, error: result.error.message ?? "The payment page couldn't open. Please try again." };
    return { ok: true };
  } catch {
    return { ok: false, error: "The payment page couldn't open. Check your connection and try again." };
  }
}

/**
 * Opens Cashfree's checkout for an unpaid order. The server creates the payment from the order in the
 * database; this button only passes the order number and its pay-link token.
 */
export function PayButton({ orderNumber, token, label, autoStart = false }: { orderNumber: string; token: string; label: string; autoStart?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const started = useRef(false);

  function pay() {
    setError(undefined);
    start(async () => {
      const res = await openPayment(orderNumber, token);
      if (res.ok) return;
      if (res.paid || res.closed) router.refresh();
      else setError(res.error);
    });
  }

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      pay();
    }
  }, [autoStart]);

  return (
    <div>
      <button type="button" onClick={pay} disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? "Opening secure payment…" : label}
      </button>
      {error && (
        <p className="mt-3 text-sm text-brand" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
