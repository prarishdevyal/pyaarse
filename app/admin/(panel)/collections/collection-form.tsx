"use client";

import { useActionState, useState } from "react";
import { SlugField } from "@/components/slug-field";
import { saveCollection } from "../../actions";
import { collectionFieldsSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";
import { ImageFileInput, type ImageInputState } from "@/components/image-file-input";

type C = { id: number; name: string; slug: string; tagline: string; sortOrder: number };

export function CollectionForm({ initial }: { initial?: C }) {
  const [state, action, pending] = useActionState(saveCollection, undefined);
  const v = useValidation(collectionFieldsSchema.shape);
  const [upload, setUpload] = useState<ImageInputState>({ busy: false, tooLarge: false });
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (upload.busy || upload.tooLarge) e.preventDefault();
    else v.onSubmit(e);
  };
  const p = (name: string) => ({ id: `${initial?.id ?? "new"}-${name}`, name, className: "input", ...v.bind, ...invalidProps(`${initial?.id ?? "new"}-${name}`, v.error(name)) });
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormField id={`${initial?.id ?? "new"}-name`} label="Name" error={v.error("name")}>
        <input {...p("name")} defaultValue={initial?.name} />
      </FormField>
      <FormField id={`${initial?.id ?? "new"}-tagline`} label="Tagline" error={v.error("tagline")}>
        <input {...p("tagline")} defaultValue={initial?.tagline} placeholder="Fresh, floral and uplifting." />
      </FormField>
      <SlugField id={`${initial?.id ?? "new"}-slug`} initialSlug={initial?.slug} nameInputId={`${initial?.id ?? "new"}-name`} path="/shop?collection=" saved={!!initial} />
      <FormField id={`${initial?.id ?? "new"}-sortOrder`} label="Order on homepage" error={v.error("sortOrder")}>
        <input {...p("sortOrder")} inputMode="numeric" defaultValue={initial?.sortOrder ?? 0} />
      </FormField>
      <div className="sm:col-span-2">
        <label className="label">Image {initial && <span className="font-normal text-taupe">(leave empty to keep current)</span>}</label>
        <ImageFileInput name="image" onState={setUpload} />
      </div>
      {state?.error && <p className="text-sm text-brand sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary" disabled={pending || upload.busy}>{pending ? "Saving…" : initial ? "Save changes" : "Add collection"}</button>
      </div>
    </form>
  );
}
