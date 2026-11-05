"use client";

import { useState } from "react";
import { compressImage, formatMB, totalBytes, UPLOAD_BUDGET_BYTES } from "@/lib/image-compress";

export type ImageInputState = { busy: boolean; tooLarge: boolean };

/** File input that optimises photos in the browser before the form is submitted. */
export function ImageFileInput({
  name,
  multiple,
  onFiles,
  onState,
}: {
  name: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  onState?: (s: ImageInputState) => void;
}) {
  const [note, setNote] = useState<string>();
  const [error, setError] = useState<string>();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = Array.from(input.files ?? []);
    setError(undefined);
    if (picked.length === 0) {
      setNote(undefined);
      onFiles?.([]);
      onState?.({ busy: false, tooLarge: false });
      return;
    }
    onState?.({ busy: true, tooLarge: false });
    setNote(`Optimising ${picked.length === 1 ? "photo" : `${picked.length} photos`}…`);
    const files = await Promise.all(picked.map((f) => compressImage(f).catch(() => f)));
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;

    const before = totalBytes(picked);
    const after = totalBytes(files);
    const tooLarge = after > UPLOAD_BUDGET_BYTES;
    setNote(after < before ? `Optimised: ${formatMB(before)} → ${formatMB(after)}` : `${formatMB(after)}`);
    if (tooLarge) setError(`These photos add up to ${formatMB(after)}. Upload up to ${formatMB(UPLOAD_BUDGET_BYTES)} at a time: save, then add the rest.`);
    onFiles?.(files);
    onState?.({ busy: false, tooLarge });
  }

  return (
    <div>
      <input
        type="file"
        name={name}
        multiple={multiple}
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-blush file:px-4 file:py-2 file:text-brand"
      />
      {note && !error && <p className="mt-2 text-xs text-taupe" aria-live="polite">{note}</p>}
      {error && <p className="mt-2 text-xs text-brand" role="alert">{error}</p>}
    </div>
  );
}
