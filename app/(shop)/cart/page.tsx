"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { useQuote } from "@/components/use-quote";
import { Totals } from "@/components/order-summary";
import { TrashIcon } from "@/components/icons";
import { AnimatedCount } from "@/components/animated-count";
import { formatINR } from "@/lib/format";
import { MAX_QTY_PER_VARIANT } from "@/lib/pricing";

export default function CartPage() {
  const { items, ready, setQuantity, remove } = useCart();
  const data = useQuote(items, ready);

  if (!ready) return <div className="container-page py-16" />;

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="heading-section">Your cart is empty</h1>
        <p className="mt-2 text-taupe">Find something warm to light up your day.</p>
        <Link href="/shop" className="btn-primary mt-8">Shop candles</Link>
      </div>
    );
  }

  const quote = data?.quote;
  const stockById = new Map(data?.variants?.map((v) => [v.id, v.stock]));
  const priceById = new Map(data?.variants?.map((v) => [v.id, v.price]));
  const wasById = new Map(data?.variants?.map((v) => [v.id, v.compareAtPrice]));

  return (
    <div className="container-page py-12">
      <h1 className="heading-section">Your Cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-sand/60">
          {items.map((i) => {
            const stock = stockById.get(i.variantId);
            const price = priceById.get(i.variantId) ?? i.price;
            const was = wasById.get(i.variantId);
            return (
              <li key={i.variantId} className="flex gap-4 py-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.image} alt="" className="h-24 w-24 rounded-xl object-cover" />
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link href={`/product/${i.productSlug}`} className="font-serif text-xl hover:text-brand">{i.productName}</Link>
                      <p className="text-sm text-taupe">{i.variantName}</p>
                    </div>
                    <p className="text-right font-medium">
                      {formatINR(price * i.quantity)}
                      {was != null && was > price && <s className="block text-xs font-normal text-taupe">{formatINR(was * i.quantity)}</s>}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <div className="flex items-center rounded-full border border-sand text-sm">
                      <button className="step-btn px-3 py-1.5" onClick={() => setQuantity(i.variantId, i.quantity - 1)} aria-label="Decrease">−</button>
                      <AnimatedCount value={i.quantity} className="w-6" />
                      <button
                        className="step-btn px-3 py-1.5 disabled:opacity-40"
                        onClick={() => setQuantity(i.variantId, i.quantity + 1)}
                        disabled={i.quantity >= MAX_QTY_PER_VARIANT || (stock !== undefined && i.quantity >= stock)}
                        aria-label="Increase"
                      >+</button>
                    </div>
                    <button onClick={() => remove(i.variantId)} className="text-taupe hover:text-brand" aria-label="Remove">
                      <TrashIcon width={18} height={18} />
                    </button>
                    {stock !== undefined && i.quantity > stock && (
                      <span className="text-xs text-brand">{stock === 0 ? "Out of stock" : `Only ${stock} available`}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="card h-fit p-6">
          <h2 className="mb-4 font-serif text-2xl">Order summary</h2>
          {quote?.ok ? (
            <Totals {...quote} freeShippingThreshold={data?.settings.freeShippingThreshold} />
          ) : quote ? (
            <p className="text-sm text-brand">{quote.error}</p>
          ) : (
            <p className="text-sm text-taupe">Calculating…</p>
          )}
          <Link
            href="/checkout"
            aria-disabled={!quote?.ok}
            className={`btn-primary mt-6 w-full ${quote?.ok ? "" : "pointer-events-none opacity-50"}`}
          >
            Proceed to checkout
          </Link>
          <p className="mt-4 text-center text-xs text-taupe">Payment via UPI QR on WhatsApp after you place your order.</p>
        </aside>
      </div>
    </div>
  );
}
