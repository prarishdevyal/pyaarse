"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "@/app/admin/actions";
import { productFieldsSchema, variantProblems } from "@/lib/validation";
import { useValidation } from "./use-validation";
import { FormField, invalidProps } from "./form-field";
import { TrashIcon } from "./icons";

type Variant = { id?: number; name: string; price: number; stock: number };
type Initial = {
  id?: number;
  name: string;
  slug: string;
  description: string;
  collectionId: number | null;
  isBestseller: boolean;
  isActive: boolean;
  images: string[];
  variants: Variant[];
};

export function AdminProductForm({ initial, collections }: { initial?: Initial; collections: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [variants, setVariants] = useState<Variant[]>(initial?.variants.length ? initial.variants : [{ name: "Standard", price: 1, stock: 0 }]);
  const [previews, setPreviews] = useState<string[]>([]);
  const v = useValidation(productFieldsSchema.shape);
  const [checkedVariants, setCheckedVariants] = useState(false);
  const problems = checkedVariants ? variantProblems(variants) : {};
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setCheckedVariants(true);
    const fieldsOk = v.validateForm(e.currentTarget);
    if (!fieldsOk || Object.keys(variantProblems(variants)).length > 0) e.preventDefault();
  };

  const updateVariant = (i: number, patch: Partial<Variant>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <input type="hidden" name="keepImages" value={JSON.stringify(images)} />

      <section className="card space-y-4 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="name" label="Name" error={v.error("name")}>
            <input id="name" name="name" className="input" defaultValue={initial?.name} {...v.bind} {...invalidProps("name", v.error("name"))} />
          </FormField>
          <div>
            <label className="label" htmlFor="slug">URL slug <span className="font-normal text-taupe">(optional)</span></label>
            <input id="slug" name="slug" className="input" defaultValue={initial?.slug} placeholder="auto from name" />
          </div>
        </div>
        <FormField id="description" label="Description" error={v.error("description")}>
          <textarea id="description" name="description" rows={5} className="input" defaultValue={initial?.description} {...v.bind} {...invalidProps("description", v.error("description"))} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div>
            <label className="label" htmlFor="collectionId">Collection</label>
            <select id="collectionId" name="collectionId" className="input" defaultValue={initial?.collectionId ?? ""}>
              <option value="">— None —</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="h-4 w-4 accent-brand" /> Visible in shop
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isBestseller" defaultChecked={initial?.isBestseller} className="h-4 w-4 accent-brand" /> Show in Bestsellers
          </label>
        </div>
      </section>

      <section className="card space-y-3 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Variants</h2>
          <button type="button" className="btn-secondary px-4 py-1.5" onClick={() => setVariants((vs) => [...vs, { name: "", price: 1, stock: 0 }])}>
            + Add variant
          </button>
        </div>
        <p className="text-xs text-taupe">E.g. “100g”, “200g · Rose”. Each variant has its own price (₹) and stock.</p>
        <div className="hidden grid-cols-[1fr_120px_100px_40px] gap-3 text-xs text-taupe sm:grid">
          <span>Name</span><span>Price (₹)</span><span>Stock</span><span />
        </div>
        {variants.map((v, i) => (
          <div key={v.id ?? `new-${i}`}>
          <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_120px_100px_40px]">
            <input className="input col-span-2 sm:col-span-1" placeholder="Variant name" aria-label="Variant name" aria-invalid={!!problems[i]} value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} />
            <div className="col-span-2 grid grid-cols-[1fr_1fr_40px] gap-3 sm:contents">
              <input className="input" type="number" min={1} step={1} aria-label="Price" aria-invalid={!!problems[i]} value={v.price} onChange={(e) => updateVariant(i, { price: Math.trunc(Number(e.target.value)) })} />
              <input className="input" type="number" min={0} step={1} aria-label="Stock" value={v.stock} onChange={(e) => updateVariant(i, { stock: Math.trunc(Number(e.target.value)) })} />
              <button
                type="button"
                className="text-taupe hover:text-brand disabled:opacity-30"
                onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}
                disabled={variants.length === 1}
                aria-label="Remove variant"
              >
                <TrashIcon width={18} height={18} />
              </button>
            </div>
          </div>
          {problems[i] && <p className="mt-1 text-xs text-brand" role="alert">{problems[i]}</p>}
          </div>
        ))}
      </section>

      <section className="card space-y-3 bg-white p-5">
        <h2 className="font-serif text-2xl">Images</h2>
        <p className="text-xs text-taupe">The first image is the main one. JPG, PNG or WebP, up to 5MB each.</p>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-24 w-24 rounded-lg object-cover" />
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                {i > 0 ? (
                  <button type="button" className="rounded bg-ivory/90 px-1.5 text-xs" onClick={() => setImages((im) => [src, ...im.filter((x) => x !== src)])}>
                    Main
                  </button>
                ) : <span />}
                <button type="button" className="rounded bg-ivory/90 px-1.5 text-xs text-brand" onClick={() => setImages((im) => im.filter((x) => x !== src))}>
                  ✕
                </button>
              </div>
            </div>
          ))}
          {previews.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-24 w-24 rounded-lg object-cover opacity-70 ring-2 ring-brand/40" />
          ))}
        </div>
        <input
          type="file"
          name="newImages"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-blush file:px-4 file:py-2 file:text-brand"
          onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))}
        />
      </section>

      {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
      <button className="btn-primary px-10" disabled={pending}>{pending ? "Saving…" : "Save product"}</button>
    </form>
  );
}
