"use client";

import { useEffect, useRef, useState } from "react";
import { moveItem } from "@/lib/move-item";
import { compressImage, formatMB, totalBytes, UPLOAD_BUDGET_BYTES } from "@/lib/image-compress";
import { mergePicked } from "@/lib/picked-files";

export type ImageInputState = { busy: boolean; tooLarge: boolean };

/**
 * File input that optimises photos in the browser before the form is submitted.
 * With `multiple`, each pick adds to the photos already chosen (phones usually pick one at a time),
 * and each new photo shows a preview with a remove button.
 */
export function ImageFileInput({
  name,
  multiple,
  onState,
}: {
  name: string;
  multiple?: boolean;
  onState?: (s: ImageInputState) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const total = totalBytes(files);
  const tooLarge = total > UPLOAD_BUDGET_BYTES;

  function commit(next: File[]) {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (input.current) input.current.files = dt.files;
    setFiles(next);
    onState?.({ busy: false, tooLarge: totalBytes(next) > UPLOAD_BUDGET_BYTES });
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.currentTarget.files ?? []);
    if (picked.length === 0) {
      // Cancelling the picker clears the input; put back what was already chosen.
      commit(files);
      return;
    }
    setBusy(true);
    onState?.({ busy: true, tooLarge: false });
    const optimised = await Promise.all(picked.map((f) => compressImage(f).catch(() => f)));
    setSaved((s) => s + Math.max(0, totalBytes(picked) - totalBytes(optimised)));
    setBusy(false);
    commit(multiple ? mergePicked(files, optimised) : optimised.slice(0, 1));
  }

  const remove = (i: number) => commit(files.filter((_, j) => j !== i));

  return (
    <div>
      {multiple && files.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-3" aria-label="New photos to upload">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {previews[i] && <img src={previews[i]} alt="" className="h-24 w-24 rounded-lg object-cover ring-2 ring-brand/40" />}
              <span className="absolute left-1 top-1 rounded bg-brand px-1.5 text-[10px] font-medium text-ivory">New {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 rounded bg-ivory/90 px-1.5 text-xs text-brand"
                aria-label={`Remove ${f.name}`}
              >
                ✕
              </button>
              {files.length > 1 && (
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button type="button" className="step-btn rounded bg-ivory/90 px-1.5 text-xs disabled:opacity-30" disabled={i === 0} onClick={() => commit(moveItem(files, i, i - 1))} aria-label={`Move new photo ${i + 1} left`}>←</button>
                  <button type="button" className="step-btn rounded bg-ivory/90 px-1.5 text-xs disabled:opacity-30" disabled={i === files.length - 1} onClick={() => commit(moveItem(files, i, i + 1))} aria-label={`Move new photo ${i + 1} right`}>→</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <label className="btn-secondary inline-flex cursor-pointer px-5">
        {busy ? "Optimising…" : multiple ? (files.length ? "Add more photos" : "Add photos") : files.length ? "Change photo" : "Choose photo"}
        <input
          ref={input}
          type="file"
          name={name}
          multiple={multiple}
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          disabled={busy}
          className="sr-only"
        />
      </label>
      {files.length > 0 && !tooLarge && (
        <p className="mt-2 text-xs text-taupe" aria-live="polite">
          {files.length} {files.length === 1 ? "photo" : "photos"} ready, {formatMB(total)}
          {saved > 0 && ` (optimised, saved ${formatMB(saved)})`}. They upload when you save.
        </p>
      )}
      {!multiple && files.length === 0 && <p className="mt-2 text-xs text-taupe">No new photo chosen.</p>}
      {tooLarge && (
        <p className="mt-2 text-xs text-brand" role="alert">
          These photos add up to {formatMB(total)}. Upload up to {formatMB(UPLOAD_BUDGET_BYTES)} at a time: remove some, save, then add the rest.
        </p>
      )}
    </div>
  );
}
