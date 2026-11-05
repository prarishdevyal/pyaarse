import { getContent } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const [t, user] = await Promise.all([getContent(), getCurrentUser()]);
  return (
    <div className="container-page max-w-2xl py-16">
      <h1 className="heading-section text-center">{t("contact.title")}</h1>
      <p className="mx-auto mt-3 max-w-[56ch] text-center text-taupe">{t("contact.intro")}</p>
      <div className="relative mt-10">
        <ContactForm defaults={{ name: user?.name ?? "", email: user?.email ?? "" }} />
      </div>
    </div>
  );
}
