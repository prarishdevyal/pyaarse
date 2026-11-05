"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart-provider";
import { useWishlist } from "./wishlist-provider";
import { BagIcon, ChevronDownIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, TruckIcon, UserIcon } from "./icons";

type Props = { loggedIn: boolean; announcement: string; collections: { name: string; slug: string }[] };

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ loggedIn, announcement, collections }: Props) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const { ids } = useWishlist();
  const cartBump = useBumpOnIncrease(count, ready);
  const wishBump = useBumpOnIncrease(ids.length, ready);
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const linkCls = (href: string) =>
    `relative py-2 text-[15px] transition hover:text-brand ${isActive(href) ? "text-brand after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded after:bg-brand" : ""}`;

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-brand text-ivory">
        <p className="container-page flex items-center justify-center gap-2 py-2 text-sm">
          <TruckIcon size={18} aria-hidden /> {announcement}
        </p>
      </div>
      <div className="border-b border-sand/50 bg-ivory/95 backdrop-blur">
        <div className="container-page flex h-[72px] items-center justify-between gap-4">
          <button className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <CloseIcon key="close" className="anim-fade" /> : <MenuIcon key="menu" className="anim-fade" />}
          </button>
          <Link href="/" aria-label="Pyaarse home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/pyaarse-logo-horizontal.svg" alt="Pyaarse" width={170} height={52} className="h-10 w-auto sm:h-12" />
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {NAV.slice(0, 2).map((n) => (
              <Link key={n.href} href={n.href} className={linkCls(n.href)}>{n.label}</Link>
            ))}
            <div className="group relative">
              <button className="flex items-center gap-1 py-2 text-[15px] hover:text-brand">
                Collections <ChevronDownIcon size={16} aria-hidden />
              </button>
              <div className="invisible absolute left-1/2 top-full w-56 -translate-x-1/2 pt-2 opacity-0 transition duration-200 ease-[var(--ease-settle)] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="card origin-top scale-95 bg-ivory p-2 transition duration-200 ease-[var(--ease-settle)] group-focus-within:scale-100 group-hover:scale-100">
                  {collections.map((c) => (
                    <Link key={c.slug} href={`/shop?collection=${c.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-blush">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {NAV.slice(2).map((n) => (
              <Link key={n.href} href={n.href} className={linkCls(n.href)}>{n.label}</Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 sm:gap-5">
            <Link href="/shop" aria-label="Search" className="hidden hover:text-brand sm:block"><SearchIcon /></Link>
            <Link href={loggedIn ? "/account" : "/login"} aria-label="Account" className="hover:text-brand"><UserIcon /></Link>
            <Link href="/wishlist" aria-label="Wishlist" className="relative hover:text-brand">
              <HeartIcon />
              {ids.length > 0 && <Badge key={wishBump} n={ids.length} pop={wishBump > 0} />}
            </Link>
            <Link href="/cart" aria-label="Cart" className="relative hover:text-brand">
              <BagIcon />
              {count > 0 && <Badge key={cartBump} n={count} pop={cartBump > 0} />}
            </Link>
          </div>
        </div>

        {open && (
          <nav className="anim-drop container-page flex flex-col gap-1 border-t border-sand/50 pb-4 pt-2 md:hidden" onClick={() => setOpen(false)}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-2 py-2 hover:bg-blush">{n.label}</Link>
            ))}
            <p className="mt-2 px-2 text-xs uppercase tracking-widest text-taupe">Collections</p>
            {collections.map((c) => (
              <Link key={c.slug} href={`/shop?collection=${c.slug}`} className="rounded-lg px-2 py-2 hover:bg-blush">{c.name}</Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

/** Counts increases after the first load, so badges pop only when something is added. */
function useBumpOnIncrease(value: number, ready: boolean) {
  const prev = useRef<number | null>(null);
  const [bumps, setBumps] = useState(0);
  useEffect(() => {
    if (!ready) return;
    if (prev.current !== null && value > prev.current) setBumps((b) => b + 1);
    prev.current = value;
  }, [value, ready]);
  return bumps;
}

function Badge({ n, pop }: { n: number; pop: boolean }) {
  return (
    <span className={`${pop ? "anim-pop " : ""}absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-medium text-ivory`}>
      {n}
    </span>
  );
}
