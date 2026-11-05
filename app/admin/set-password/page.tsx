import { SetPasswordForm } from "./set-password-form";

export const metadata = { title: "Set your password", robots: { index: false } };

export default async function SetAdminPasswordPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const { token_hash = "", type = "invite" } = await searchParams;
  return <SetPasswordForm tokenHash={token_hash} type={type === "recovery" ? "recovery" : "invite"} />;
}
