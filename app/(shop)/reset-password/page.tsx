import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token_hash?: string }> }) {
  const { token_hash = "" } = await searchParams;
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="heading-section text-center">Choose a new password</h1>
      <div className="card mt-8 p-6">
        <ResetPasswordForm tokenHash={token_hash} />
      </div>
    </div>
  );
}
