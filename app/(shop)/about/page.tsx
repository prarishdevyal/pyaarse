import Link from "next/link";
import { getContent } from "@/lib/content";

export const metadata = { title: "Our story" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const t = await getContent();
  return (
    <div>
      <section className="bg-blush">
        <div className="container-page max-w-3xl py-16 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/pyaarse-mark.svg" alt="" className="mx-auto h-24 w-auto" />
          <h1 className="heading-xl mt-6">{t("about.title")}</h1>
          <p className="mx-auto mt-5 max-w-[60ch] text-lg text-charcoal/85">{t("about.intro")}</p>
        </div>
      </section>
      <section className="container-page grid max-w-5xl gap-10 py-16 md:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <h2 className="font-serif text-2xl text-brand">{t(`about.point.${n}.title`)}</h2>
            <p className="mt-2 text-charcoal/80">{t(`about.point.${n}.text`)}</p>
          </div>
        ))}
      </section>
      <div className="text-center">
        <Link href="/shop" className="btn-primary">{t("about.cta")}</Link>
      </div>
    </div>
  );
}
