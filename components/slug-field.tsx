"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/lib/format";

/** The "web address" box for products and collections, with a live preview of the link customers will see. */
export function SlugField({ id, initialSlug, nameInputId, path, saved }: {
  id: string;
  initialSlug?: string;
  /** The Name box this falls back to when left empty. */
  nameInputId: string;
  /** e.g. "/product/" or "/shop?collection=" */
  path: string;
  /** True when editing something that already exists (changing it then breaks old links). */
  saved?: boolean;
}) {
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [name, setName] = useState("");
  const [host, setHost] = useState("pyaarse.net");

  useEffect(() => {
    setHost(window.location.host.replace(/^admin\./, ""));
    const el = document.getElementById(nameInputId) as HTMLInputElement | null;
    if (!el) return;
    const read = () => setName(el.value);
    read();
    el.addEventListener("input", read);
    return () => el.removeEventListener("input", read);
  }, [nameInputId]);

  const preview = slugify(slug || name);
  return (
    <div>
      <label className="label" htmlFor={id}>
        Web address <span className="font-normal text-taupe">(optional)</span>
      </label>
      <input id={id} name="slug" className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Made from the name" aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-taupe">
        The last part of the link to this page. Leave it empty to make it from the name.
        {preview && (
          <>
            {" "}Link: <span className="break-all text-charcoal">{host}{path}<strong>{preview}</strong></span>
          </>
        )}
        {saved && " Changing it breaks links people have already shared."}
      </p>
    </div>
  );
}
