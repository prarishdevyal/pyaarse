import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "@/app/actions";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { next } = await searchParams;
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="heading-section text-center">Create your account</h1>
      <div className="card mt-8 p-6">
        <AuthForm
          action={register}
          rules="register"
          next={next}
          submitLabel="Create account"
          fields={[
            { name: "name", label: "Full name", autoComplete: "name" },
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
          ]}
        />
      </div>
      <p className="mt-4 text-center text-xs text-taupe">
        By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy policy</Link>.
      </p>
      <p className="mt-6 text-center text-sm">
        Already have an account? <Link href="/login" className="text-brand underline">Log in</Link>
      </p>
    </div>
  );
}
