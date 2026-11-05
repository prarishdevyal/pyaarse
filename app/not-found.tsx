import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-serif text-5xl italic text-brand">Not found</h1>
      <p className="mt-3 text-taupe">This page has burned out.</p>
      <Link href="/" className="btn-primary mt-8">Go home</Link>
    </div>
  );
}
