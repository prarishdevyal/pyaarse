import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

// Every page reads live data (site text, settings, stock), so nothing is pre-built: the build then needs no database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Pyaarse — Handcrafted Candles", template: "%s · Pyaarse" },
  description: "Handcrafted candles to make your moments warmer, calmer and more meaningful.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
