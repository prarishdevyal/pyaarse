"use client";

import { useActionState, useState } from "react";
import { resetHeroImage, saveHeroImage } from "../../actions";
import { ImageFileInput, type ImageInputState } from "@/components/image-file-input";
import { ConfirmSubmit } from "@/components/confirm-submit";

/** Upload or reset the home page's top banner photo. */
export function HeroImageForm({ current, custom }: { current: string; custom: boolean }) {
  const [state, action, pending] = useActionState(saveHeroImage, undefined);
  const [upload, setUpload] = useState<ImageInputState>({ busy: false, tooLarge: false });
  return (
    <section className="card space-y-4 bg-white p-5">
      <div>
        <h2 className="font-serif text-2xl">Banner photo</h2>
        <p className="mt-1 text-xs text-taupe">
          The big photo at the top of the home page. Use a wide, landscape photo with the candle towards the middle or right: on
          computers the text sits on the left, on phones the photo shows above the text. JPG, PNG or WebP.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt="Current banner photo" className="h-32 w-56 rounded-lg object-cover shadow-soft" />
        <p className="text-sm text-taupe">{custom ? "Your uploaded photo" : "The original photo"}</p>
      </div>
      <form action={action} key={state?.success} className="flex flex-wrap items-end gap-4">
        <ImageFileInput name="image" onState={setUpload} />
        <button className="btn-primary px-8" disabled={pending || upload.busy || upload.tooLarge}>
          {pending ? "Uploading…" : upload.busy ? "Optimising photo…" : "Save photo"}
        </button>
      </form>
      {state?.success && <p className="text-sm text-emerald-800" role="status">{state.success}</p>}
      {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
      {custom && (
        <form action={resetHeroImage} className="border-t border-sand/60 pt-3">
          <ConfirmSubmit label="Go back to the original photo" confirmLabel="Yes, use the original" />
        </form>
      )}
    </section>
  );
}
