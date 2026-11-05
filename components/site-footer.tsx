import Link from "next/link";
import { storeContact } from "@/lib/store";
import { AtSignIcon, MailIcon, MessageCircleIcon } from "./icons";

export function SiteFooter({ tagline }: { tagline: string }) {
  const c = storeContact();
  const whatsapp = c.whatsappLink("Hi Pyaarse!");
  const link = "transition hover:text-ivory";
  return (
    <footer className="mt-24 bg-burgundy text-ivory/80">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/pyaarse-logo-horizontal-ivory.svg" alt="Pyaarse" className="h-12 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-ivory/70">{tagline}</p>
        </div>
        <nav aria-label="Shop" className="text-sm">
          <p className="mb-3 font-medium text-ivory">Shop</p>
          <ul className="space-y-2">
            <li><Link href="/shop" className={link}>All candles</Link></li>
            <li><Link href="/about" className={link}>Our story</Link></li>
            <li><Link href="/wishlist" className={link}>Wishlist</Link></li>
            <li><Link href="/account" className={link}>Your orders</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help" className="text-sm">
          <p className="mb-3 font-medium text-ivory">Help</p>
          <ul className="space-y-2">
            <li><Link href="/contact" className={link}>Contact us</Link></li>
            <li><Link href="/terms" className={link}>Terms &amp; conditions</Link></li>
            <li><Link href="/privacy" className={link}>Privacy policy</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="mb-3 font-medium text-ivory">Say hello</p>
          <ul className="space-y-2">
            {whatsapp && (
              <li><a href={whatsapp} target="_blank" rel="noreferrer" className={`flex items-center gap-2 ${link}`}><MessageCircleIcon size={16} aria-hidden /> WhatsApp</a></li>
            )}
            <li><a href={`mailto:${c.email}`} className={`flex items-center gap-2 ${link}`}><MailIcon size={16} aria-hidden /> {c.email}</a></li>
            <li><a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer" className={`flex items-center gap-2 ${link}`}><AtSignIcon size={16} aria-hidden /> @{c.instagram}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <p className="container-page py-5 text-xs text-ivory/60">© {new Date().getFullYear()} Pyaarse</p>
      </div>
    </footer>
  );
}
