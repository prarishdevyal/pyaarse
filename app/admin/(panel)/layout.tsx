import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminLogout } from "../actions";

export const metadata = { title: { default: "Admin", template: "%s · Pyaarse Admin" }, robots: { index: false } };

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/messages", label: "Messages" },
  { href: "/products", label: "Products" },
  { href: "/collections", label: "Collections" },
  { href: "/content", label: "Site text" },
  { href: "/settings", label: "Settings" },
];

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-screen bg-[#fbf8f3]">
      <header className="border-b border-sand/60 bg-ivory">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/pyaarse-logo-horizontal.svg" alt="Pyaarse" className="h-8 w-auto" />
            <span className="text-sm text-taupe">admin</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 hover:bg-blush hover:text-brand">{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-taupe">
            <span className="hidden sm:inline">{user.email}</span>
            <form action={adminLogout}><button className="rounded-lg px-3 py-1.5 hover:bg-blush hover:text-brand">Log out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
