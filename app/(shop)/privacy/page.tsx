import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" contentKey="legal.privacy" />;
}
