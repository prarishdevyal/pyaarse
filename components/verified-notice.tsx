"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/** "Email verified" note after a confirmation link signs someone in; tidies ?verified=1 out of the address bar. */
export function VerifiedNotice() {
  const params = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (params.get("verified") !== "1") return;
    setShow(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("verified");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    const t = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(t);
  }, [params]);

  if (!show) return null;
  return (
    <div className="anim-drop fixed inset-x-0 top-4 z-50 flex justify-center px-4" role="status">
      <div className="flex items-center gap-3 rounded-full bg-emerald-50 px-5 py-3 text-sm text-emerald-900 shadow-soft">
        <span>Your email is verified. You&apos;re logged in.</span>
        <button type="button" onClick={() => setShow(false)} className="text-emerald-900/70 underline" aria-label="Dismiss">OK</button>
      </div>
    </div>
  );
}
