import Link from "next/link";
import { getCollections, getProductCards } from "@/lib/catalog";
import { getContent } from "@/lib/content";
import { storeContact } from "@/lib/store";
import { ProductCard } from "@/components/product-card";
import { ArrowRightIcon, BoxIcon, GiftIcon, HeartIcon, LeafIcon, PlusIcon, SparkleIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

const HIGHLIGHT_ICONS = [LeafIcon, HeartIcon, SparkleIcon, BoxIcon];
const REVIEW_COLS: Record<number, string> = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-3" };

export default async function HomePage() {
  const [collections, bestsellers, t] = await Promise.all([
    getCollections(),
    getProductCards({ bestsellers: true, limit: 4 }),
    getContent(),
  ]);
  const contact = storeContact();
  const giftHref = contact.whatsappLink("Hi Pyaarse! I'd like to plan a gift.") ?? "/contact";
  const reviews = [1, 2, 3]
    .map((n) => ({ quote: t(`home.review.${n}.quote`), name: t(`home.review.${n}.name`) }))
    .filter((r) => r.quote);
  const faqs = [1, 2, 3, 4, 5, 6]
    .map((n) => ({ q: t(`home.faq.${n}.q`), a: t(`home.faq.${n}.a`) }))
    .filter((f) => f.q && f.a);
  const [titleFirst, ...titleRest] = t("home.hero.title").split("\n");
  const heroImage = "/placeholders/hero.jpg";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-blush">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt=""
          className="anim-settle absolute inset-y-0 right-0 h-full w-full object-cover md:w-[66%] md:[mask-image:linear-gradient(to_right,transparent,black_35%)]"
        />
        <div className="absolute inset-0 bg-blush/80 md:hidden" />
        <div className="container-page relative flex min-h-[460px] flex-col justify-center py-16 md:min-h-[540px]">
          <p className="anim-rise text-xs uppercase tracking-[0.4em] text-charcoal/80">{t("home.hero.eyebrow")}</p>
          <h1 className="anim-rise heading-xl mt-5 max-w-xl" style={{ "--delay": "120ms" } as React.CSSProperties}>
            {titleFirst}
            {titleRest.map((l, i) => (
              <span key={i}>
                <br />
                {l}
              </span>
            ))}
          </h1>
          <p className="anim-rise mt-5 max-w-md text-lg text-charcoal/85" style={{ "--delay": "260ms" } as React.CSSProperties}>{t("home.hero.subtitle")}</p>
          <Link href="/shop" className="anim-rise btn-primary mt-8 w-fit px-8" style={{ "--delay": "380ms" } as React.CSSProperties}>
            {t("home.hero.cta")} <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      {/* Highlights */}
      <section className="container-page relative z-10 -mt-6">
        <ul className="grid grid-cols-2 gap-y-6 rounded-[14px] bg-blush/95 px-4 py-6 shadow-soft lg:grid-cols-4 lg:divide-x lg:divide-sand">
          {HIGHLIGHT_ICONS.map((Icon, i) => (
            <li key={i} className="flex items-center gap-3 px-3 lg:justify-center">
              <Icon size={28} className="shrink-0 text-brand" aria-hidden />
              <div>
                <p className="font-serif text-lg font-medium leading-tight">{t(`home.highlight.${i + 1}.title`)}</p>
                <p className="text-xs text-taupe">{t(`home.highlight.${i + 1}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Collections */}
      {collections.length > 0 && (
        <section className="container-page mt-20">
          <div className="text-center">
            <h2 className="heading-section">{t("home.collections.title")}</h2>
            <p className="mt-2 text-taupe">{t("home.collections.subtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((c, i) => (
              <Link key={c.id} href={`/shop?collection=${c.slug}`} className="group relative block aspect-[5/4] overflow-hidden rounded-[14px] shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image ?? `/placeholders/collection-${(i % 4) + 1}.jpg`} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-ivory">
                  <div>
                    <p className="font-serif text-2xl leading-tight">{c.name}</p>
                    <p className="text-sm text-ivory/85">{c.tagline}</p>
                  </div>
                  <span className="rounded-full bg-ivory p-2 text-charcoal"><ArrowRightIcon size={16} aria-hidden /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bestsellers */}
      {bestsellers.length > 0 && (
        <section className="container-page mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="heading-section">{t("home.bestsellers.title")}</h2>
              <p className="mt-1 text-taupe">{t("home.bestsellers.subtitle")}</p>
            </div>
            <Link href="/shop" className="flex shrink-0 items-center gap-1 text-sm text-brand underline-offset-4 hover:underline">
              View all <ArrowRightIcon size={16} aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {bestsellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Our story: typographic, built around the heart mark */}
      <section className="container-page mt-24">
        <div className="grid items-center gap-10 rounded-[14px] bg-blush px-6 py-12 sm:px-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/pyaarse-mark.svg" alt="" className="mx-auto w-40 sm:w-52 md:w-64" />
          <div>
            <h2 className="font-serif text-4xl leading-tight text-brand sm:text-5xl">{t("home.story.title")}</h2>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-charcoal/85">{t("home.story.text")}</p>
            <Link href="/about" className="btn-secondary mt-8">{t("home.story.cta")}</Link>
          </div>
        </div>
      </section>

      {/* How ordering works: a real sequence, so the steps are numbered */}
      <section className="container-page mt-24">
        <h2 className="heading-section text-center">{t("home.steps.title")}</h2>
        <div className="relative mt-10">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-6 hidden h-px bg-sand md:block" />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {[1, 2, 3].map((n) => (
            <li key={n} className="relative text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-brand bg-ivory font-serif text-2xl text-brand">
                {n}
              </span>
              <h3 className="mt-4 font-serif text-2xl">{t(`home.steps.${n}.title`)}</h3>
              <p className="mx-auto mt-2 max-w-xs text-charcoal/80">{t(`home.steps.${n}.text`)}</p>
            </li>
          ))}
          </ol>
        </div>
      </section>

      {/* Gifting */}
      <section className="mt-24 bg-burgundy text-ivory">
        <div className="container-page flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <GiftIcon size={44} className="mt-1 hidden shrink-0 text-blush sm:block" aria-hidden />
            <div>
              <h2 className="font-serif text-4xl leading-tight">{t("home.gifting.title")}</h2>
              <p className="mt-3 max-w-[56ch] text-ivory/80">{t("home.gifting.text")}</p>
            </div>
          </div>
          <a
            href={giftHref}
            {...(giftHref.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ivory px-7 py-3 text-sm font-medium text-burgundy transition hover:bg-blush"
          >
            {t("home.gifting.cta")}
          </a>
        </div>
      </section>

      {/* Reviews: only shown once real ones are added in the admin */}
      {reviews.length > 0 && (
        <section className="container-page mt-24">
          <h2 className="heading-section text-center">{t("home.reviews.title")}</h2>
          <div className={`mt-10 grid gap-10 ${REVIEW_COLS[reviews.length]}`}>
            {reviews.map((r, i) => (
              <figure key={i} className="mx-auto max-w-md text-center">
                <blockquote className="font-serif text-2xl italic leading-snug text-charcoal">“{r.quote}”</blockquote>
                {r.name && <figcaption className="mt-4 text-sm text-taupe">{r.name}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container-page mt-24 grid gap-8 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div>
            <h2 className="heading-section">{t("home.faq.title")}</h2>
            <p className="mt-3 text-taupe">
              Still unsure?{" "}
              <Link href="/contact" className="text-brand underline underline-offset-4">Message us</Link>
            </p>
          </div>
          <div className="divide-y divide-sand border-y border-sand">
            {faqs.map((f, i) => (
              <details key={i} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <PlusIcon size={20} className="shrink-0 text-brand transition-transform duration-200 group-open:rotate-45" aria-hidden />
                </summary>
                <p className="mt-3 max-w-[65ch] whitespace-pre-line text-charcoal/80">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
