"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkout } from "@/app/actions";
import { useCart } from "@/components/cart-provider";
import { useQuote } from "@/components/use-quote";
import { Totals } from "@/components/order-summary";
import { formatINR } from "@/lib/format";
import { INDIA_STATES, STATE_NAMES } from "@/lib/india";
import { checkoutFieldsShape } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";

const OTHER = "__other__";

type Prefill = { name: string; email: string; phone: string } | null;

export function CheckoutForm({ user, paymentNote }: { user: Prefill; paymentNote: string }) {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const data = useQuote(items, ready);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const v = useValidation(checkoutFieldsShape, fieldErrors);
  const [state, setState] = useState("");
  const [cityChoice, setCityChoice] = useState("");
  const cities = state ? INDIA_STATES[state] ?? [] : [];

  if (!ready) return null;
  if (items.length === 0) {
    return (
      <p className="mt-8 text-taupe">
        Your cart is empty. <Link href="/shop" className="text-brand underline">Continue shopping</Link>
      </p>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!v.validateForm(e.currentTarget)) {
      setError("Please fix the highlighted fields.");
      return;
    }
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    delete f.cityChoice;
    setError(undefined);
    setFieldErrors({});
    start(async () => {
      const res = await checkout({ ...f, items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) });
      if (res.ok) {
        clear();
        router.push(`/order-confirmed?n=${encodeURIComponent(res.orderNumber)}`);
      } else {
        setError(res.error ?? (res.fieldErrors?.items ? res.fieldErrors.items : "Please check the highlighted fields."));
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <FormField id={name} label={label} error={v.error(name)}>
      <input id={name} name={name} className="input" {...v.bind} {...invalidProps(name, v.error(name))} {...props} />
    </FormField>
  );

  const quote = data?.quote;

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        {!user && (
          <p className="rounded-xl bg-blush px-4 py-3 text-sm">
            Have an account? <Link href="/login?next=/checkout" className="text-brand underline">Log in</Link> to track your orders. Or just continue as a guest.
          </p>
        )}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-4 font-serif text-2xl">Contact</legend>
          <div className="sm:col-span-2">{field("customerName", "Full name", { defaultValue: user?.name, autoComplete: "name", required: true })}</div>
          {field("email", "Email", { type: "email", defaultValue: user?.email, autoComplete: "email", required: true })}
          {field("phone", "WhatsApp number", { type: "tel", defaultValue: user?.phone, autoComplete: "tel", placeholder: "10-digit mobile", required: true })}
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-4 font-serif text-2xl">Shipping address</legend>
          <div className="sm:col-span-2">{field("addressLine", "Address", { autoComplete: "street-address", placeholder: "House no, street, area, landmark", required: true })}</div>
          <FormField id="state" label="State" error={v.error("state")}>
            <select
              id="state"
              name="state"
              value={state}
              autoComplete="address-level1"
              className="input"
              {...invalidProps("state", v.error("state"))}
              onBlur={v.onBlur}
              onChange={(e) => {
                setState(e.target.value);
                setCityChoice("");
                v.onChange(e);
              }}
            >
              <option value="" disabled>Choose your state</option>
              {STATE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField id="city" label="City" error={v.error("city")}>
            {cityChoice === OTHER ? (
              <input id="city" name="city" autoFocus autoComplete="address-level2" placeholder="Type your city or town" className="input" {...v.bind} {...invalidProps("city", v.error("city"))} />
            ) : (
              <>
                <select
                  id="city"
                  name={cityChoice ? "cityChoice" : "city"}
                  value={cityChoice}
                  disabled={!state}
                  className="input disabled:cursor-not-allowed disabled:opacity-60"
                  {...invalidProps("city", v.error("city"))}
                  onBlur={v.onBlur}
                  onChange={(e) => {
                    setCityChoice(e.target.value);
                    if (e.target.value !== OTHER) v.onChange(e);
                  }}
                >
                  <option value="" disabled>{state ? "Choose your city" : "Choose a state first"}</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value={OTHER}>Other (type it)</option>
                </select>
                {cityChoice && cityChoice !== OTHER && <input type="hidden" name="city" value={cityChoice} />}
              </>
            )}
          </FormField>
          {field("pincode", "Pincode", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 6, required: true })}
          <div className="sm:col-span-2">
            <FormField id="notes" label="Order notes" optional error={v.error("notes")}>
              <textarea id="notes" name="notes" rows={3} maxLength={500} className="input" placeholder="Gift message, delivery instructions…" {...v.bind} />
            </FormField>
          </div>
        </fieldset>
      </div>

      <aside className="card h-fit p-6">
        <h2 className="mb-4 font-serif text-2xl">Your order</h2>
        <ul className="mb-4 space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-3">
              <span>{i.productName} <span className="text-taupe">({i.variantName}) × {i.quantity}</span></span>
              <span>{formatINR((data?.variants?.find((v) => v.id === i.variantId)?.price ?? i.price) * i.quantity)}</span>
            </li>
          ))}
        </ul>
        {quote?.ok ? <Totals {...quote} /> : quote ? <p className="text-sm text-brand">{quote.error}</p> : <p className="text-sm text-taupe">Calculating…</p>}
        <div className="mt-5 rounded-xl bg-blush p-4 text-sm">
          <strong>How payment works:</strong> {paymentNote}
        </div>
        {error && <p className="mt-4 text-sm text-brand" role="alert">{error}</p>}
        <button type="submit" className="btn-primary mt-5 w-full" disabled={pending || !quote?.ok}>
          {pending ? "Placing order…" : "Place order"}
        </button>
        <p className="mt-3 text-center text-xs text-taupe">
          By placing your order you agree to our{" "}
          <Link href="/terms" className="underline hover:text-brand">Terms</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-brand">Privacy policy</Link>.
        </p>
      </aside>
    </form>
  );
}
