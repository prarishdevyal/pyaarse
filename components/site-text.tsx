"use client";

import { createContext, useContext } from "react";
import { fillText } from "@/lib/fill-text";

const SiteTextContext = createContext<Record<string, string>>({});

/** Gives the in-browser parts of the shop the admin-edited labels (see CLIENT_TEXT_KEYS). */
export function SiteTextProvider({ texts, children }: { texts: Record<string, string>; children: React.ReactNode }) {
  return <SiteTextContext.Provider value={texts}>{children}</SiteTextContext.Provider>;
}

export function useSiteText(): (key: string, vars?: Record<string, string | number>) => string {
  const texts = useContext(SiteTextContext);
  return (key, vars) => fillText(texts[key] ?? "", vars);
}
