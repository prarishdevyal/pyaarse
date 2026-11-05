import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return <LegalPage title="Terms & conditions" contentKey="legal.terms" />;
}
