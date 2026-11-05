import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; confirm?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { next, confirm } = await searchParams;
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="heading-section text-center">Welcome back</h1>
      {confirm === "failed" && (
        <p className="mt-6 rounded-xl bg-blush px-4 py-3 text-center text-sm">That confirmation link is invalid or has expired. Try logging in, or register again.</p>
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
      <p className="mt-6 text-center text-sm">
        New to Pyaarse? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand underline">Create an account</Link>
      </p>
    </div>
  );
}
