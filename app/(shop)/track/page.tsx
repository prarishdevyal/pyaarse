import { getContent } from "@/lib/content";
import { TrackForm } from "./track-form";

export const metadata = { title: "Track your order" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const [{ n }, t] = await Promise.all([searchParams, getContent()]);
  const orderNumber = n && /^PY\d{1,9}$/i.test(n) ? n.toUpperCase() : "";
  return (
    <div className="container-page max-w-2xl py-14">
      <h1 className="heading-section text-center">{t("track.title")}</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-taupe">{t("track.intro")}</p>
      <TrackForm orderNumber={orderNumber} />
    </div>
  );
}
