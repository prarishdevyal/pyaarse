import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { requestPasswordReset } from "@/app/actions";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="heading-section text-center">Forgot your password?</h1>
      <p className="mt-3 text-center text-taupe">Enter the email you registered with and we&apos;ll send you a link to choose a new one.</p>
      <div className="card mt-8 p-6">
        <ForgotPasswordForm action={requestPasswordReset} />
      </div>
      <p className="mt-6 text-center text-sm">
        Remembered it? <Link href="/login" className="text-brand underline">Log in</Link>
      </p>
    </div>
  );
}
