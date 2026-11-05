"use client";

import { useState } from "react";

/**
 * Phones: opens the share sheet with the invoice PDF attached (pick WhatsApp, then the chat).
 * Computers: downloads the PDF and opens the customer's WhatsApp chat with the message ready, to attach it there.
 */
export function ShareInvoiceButton({ pdfUrl, filename, waNumber, message }: { pdfUrl: string; filename: string; waNumber: string; message: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();

  async function share() {
    setBusy(true);
    setNote(undefined);
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error(`Couldn't make the invoice (${res.status})`);
      const file = new File([await res.blob()], filename, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: message });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank", "noreferrer");
      setNote(`${filename} downloaded. Attach it in the WhatsApp chat that just opened.`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={share} disabled={busy} className="btn-primary w-full bg-[#1f8f4e] hover:bg-[#177040]">
        {busy ? "Preparing invoice…" : "Send invoice on WhatsApp"}
      </button>
      {note && <p className="mt-2 text-xs text-taupe" role="status">{note}</p>}
    </div>
  );
}
