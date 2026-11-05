import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/redirect";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; confirm?: string }> }) {
  const { next, confirm } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="heading-section text-center">Welcome back</h1>
      {confirm === "verified" && (
        <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900" role="status">Your email is verified. Log in to continue.</p>
      )}
      {confirm === "failed" && (
        <p className="mt-6 rounded-xl bg-blush px-4 py-3 text-center text-sm" role="alert">That confirmation link has expired or was already used. If you&apos;ve confirmed before, just log in. Otherwise, register again for a new link.</p>
      )}
      <div className="card mt-8 p-6">
        <AuthForm
          action={login}
          rules="login"
          next={next}
          submitLabel="Log in"
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
          ]}
        />
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="text-brand underline">Forgot your password?</Link>
      </p>
      <p className="mt-3 text-center text-sm">
        New to Pyaarse? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand underline">Create an account</Link>
      </p>
    </div>
  );
}
