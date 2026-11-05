import Link from "next/link";
import { getContent } from "@/lib/content";

export default async function NotFound() {
  const t = await getContent();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-serif text-5xl italic text-brand">{t("notFound.title")}</h1>
      <p className="mt-3 text-taupe">{t("notFound.text")}</p>
      <Link href="/" className="btn-primary mt-8">{t("notFound.cta")}</Link>
    </div>
  );
}
