"use client";

import { useActionState } from "react";
import { saveCollection } from "../../actions";
import { collectionFieldsSchema } from "@/lib/validation";
import { useValidation } from "@/components/use-validation";
import { FormField, invalidProps } from "@/components/form-field";

type C = { id: number; name: string; slug: string; tagline: string; sortOrder: number };

export function CollectionForm({ initial }: { initial?: C }) {
  const [state, action, pending] = useActionState(saveCollection, undefined);
  const v = useValidation(collectionFieldsSchema.shape);
  const p = (name: string) => ({ id: `${initial?.id ?? "new"}-${name}`, name, className: "input", ...v.bind, ...invalidProps(`${initial?.id ?? "new"}-${name}`, v.error(name)) });
  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormField id={`${initial?.id ?? "new"}-name`} label="Name" error={v.error("name")}>
        <input {...p("name")} defaultValue={initial?.name} />
      </FormField>
      <FormField id={`${initial?.id ?? "new"}-tagline`} label="Tagline" error={v.error("tagline")}>
        <input {...p("tagline")} defaultValue={initial?.tagline} placeholder="Fresh, floral and uplifting." />
      </FormField>
      <div>
        <label className="label">URL slug <span className="font-normal text-taupe">(optional)</span></label>
        <input name="slug" className="input" defaultValue={initial?.slug} placeholder="auto from name" />
      </div>
      <FormField id={`${initial?.id ?? "new"}-sortOrder`} label="Order on homepage" error={v.error("sortOrder")}>
        <input {...p("sortOrder")} inputMode="numeric" defaultValue={initial?.sortOrder ?? 0} />
      </FormField>
      <div className="sm:col-span-2">
        <label className="label">Image {initial && <span className="font-normal text-taupe">(leave empty to keep current)</span>}</label>
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-blush file:px-4 file:py-2 file:text-brand" />
      </div>
      {state?.error && <p className="text-sm text-brand sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : initial ? "Save changes" : "Add collection"}</button>
      </div>
    </form>
  );
}
