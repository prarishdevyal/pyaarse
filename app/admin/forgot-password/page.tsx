import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { adminRequestPasswordReset } from "../actions";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function AdminForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-blush px-4">
      <div className="card w-full max-w-sm space-y-4 bg-ivory p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/pyaarse-mark.svg" alt="" className="mx-auto h-16 w-auto" />
        <h1 className="text-center font-serif text-3xl italic text-brand">Reset admin password</h1>
        <p className="text-center text-sm text-taupe">Enter your admin email and we&apos;ll send you a link to choose a new password.</p>
        <ForgotPasswordForm action={adminRequestPasswordReset} />
        <p className="text-center text-sm"><Link href="/login" className="text-brand underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
