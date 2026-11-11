"use client";

import { useActionState, useState } from "react";
import { moveItem } from "@/lib/move-item";
import { SlugField } from "@/components/slug-field";
import { saveProduct } from "@/app/admin/actions";
import { productFieldsSchema, variantProblems } from "@/lib/validation";
import { useValidation } from "./use-validation";
import { FormField, invalidProps } from "./form-field";
import { TrashIcon } from "./icons";
import { ImageFileInput, type ImageInputState } from "./image-file-input";

/** price = regular price; salePrice = optional lower price. Weight and box size are admin-only (for Delhivery). */
type Variant = {
  id?: number;
  name: string;
  /** Optional sub-variant (e.g. Rose under Box of 4), with its own price and stock. */
  subName?: string;
  price: number;
  salePrice: number | null;
  stock: number;
  weightGrams?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
};
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
  const [variants, setVariants] = useState<Variant[]>(initial?.variants.length ? initial.variants : [{ name: "Standard", price: 1, salePrice: null, stock: 0 }]);
  const [upload, setUpload] = useState<ImageInputState>({ busy: false, tooLarge: false });
  const v = useValidation(productFieldsSchema.shape);
  const [checkedVariants, setCheckedVariants] = useState(false);
  const problems = checkedVariants ? variantProblems(variants) : {};
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setCheckedVariants(true);
    const fieldsOk = v.validateForm(e.currentTarget);
    if (!fieldsOk || Object.keys(variantProblems(variants)).length > 0 || upload.busy || upload.tooLarge) e.preventDefault();
  };

  const updateVariant = (i: number, patch: Partial<Variant>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  /** Renaming a variant that has sub-variants renames all of them, so they stay together. */
  const renameVariant = (i: number, name: string) =>
    setVariants((vs) => {
      const old = vs[i].name;
      const grouped = vs.filter((v) => v.name === old).length > 1;
      return vs.map((v, j) => (j === i || (grouped && v.name === old) ? { ...v, name } : v));
    });
  /** A new sub-variant goes right after the last one of its variant, starting from the same price and box size. */
  const addSubVariant = (i: number) =>
    setVariants((vs) => {
      const base = vs[i];
      const last = vs.reduce((at, v, j) => (v.name === base.name ? j : at), i);
      const copy: Variant = { ...base, id: undefined, subName: "", stock: 0 };
      return [...vs.slice(0, last + 1), copy, ...vs.slice(last + 1)];
    });

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
          <SlugField id="slug" initialSlug={initial?.slug} nameInputId="name" path="/product/" saved={!!initial?.id} />
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
          <button type="button" className="btn-secondary px-4 py-1.5" onClick={() => setVariants((vs) => [...vs, { name: "", price: 1, salePrice: null, stock: 0 }])}>
            + Add variant
          </button>
        </div>
        <p className="text-xs text-taupe">
          E.g. “100g”, “Box of 4”. To offer choices inside a variant (e.g. fragrances), use <strong>+ Add sub-variant</strong>: each sub-variant (“Box of 4 · Rose”) has its own price and stock, and customers pick the variant first, then the sub-variant.
          Each row also has an optional packed weight and box size for shipping that only admins see. To put a row on sale, add a sale price: customers see the regular price crossed out.
        </p>
        <div className="hidden grid-cols-[1fr_1fr_110px_110px_90px_40px] gap-3 text-xs text-taupe sm:grid">
          <span>Variant</span><span>Sub-variant (optional)</span><span>Price (₹)</span><span>Sale price (₹)</span><span>Stock</span><span />
        </div>
        {variants.map((v, i) => {
          const isSub = i > 0 && !!v.name && variants[i - 1].name === v.name;
          return (
          <div key={v.id ?? `new-${i}`} className={isSub ? "border-l-2 border-blush pl-3 sm:ml-4" : "border-t border-sand/40 pt-3 first:border-0 first:pt-0"}>
          <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_1fr_110px_110px_90px_40px]">
            <input className="input col-span-2 sm:col-span-1" placeholder="Variant name" aria-label="Variant name" aria-invalid={!!problems[i]} value={v.name} onChange={(e) => renameVariant(i, e.target.value)} />
            <input className="input col-span-2 sm:col-span-1" placeholder="—" aria-label="Sub-variant name (optional)" aria-invalid={!!problems[i]} value={v.subName ?? ""} onChange={(e) => updateVariant(i, { subName: e.target.value })} />
            <div className="col-span-2 grid grid-cols-[1fr_1fr_1fr_40px] gap-3 sm:contents">
              <input className="input" type="number" min={1} step={1} aria-label="Price" aria-invalid={!!problems[i]} value={v.price} onChange={(e) => updateVariant(i, { price: Math.trunc(Number(e.target.value)) })} />
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                aria-label="Sale price (optional)"
                placeholder="—"
                aria-invalid={!!problems[i]}
                value={v.salePrice ?? ""}
                onChange={(e) => updateVariant(i, { salePrice: e.target.value === "" ? null : Math.trunc(Number(e.target.value)) })}
              />
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
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-taupe">
            <span className="w-full sm:w-auto">Shipping (admin only):</span>
            <input className="input w-24 py-1.5 text-sm" type="number" min={1} step={1} inputMode="numeric" placeholder="Weight" aria-label="Packed weight in grams" value={v.weightGrams ?? ""} onChange={(e) => updateVariant(i, { weightGrams: e.target.value === "" ? null : Math.trunc(Number(e.target.value)) })} />
            <span>g</span>
            {(["lengthCm", "widthCm", "heightCm"] as const).map((k, j) => (
              <span key={k} className="flex items-center gap-2">
                {j > 0 && <span>×</span>}
                <input className="input w-20 py-1.5 text-sm" type="number" min={0.1} step={0.1} inputMode="decimal" placeholder={["L", "W", "H"][j]} aria-label={`Box ${["length", "width", "height"][j]} in cm`} value={v[k] ?? ""} onChange={(e) => updateVariant(i, { [k]: e.target.value === "" ? null : Math.round(Number(e.target.value) * 10) / 10 })} />
              </span>
            ))}
            <span>cm</span>
          </div>
          {problems[i] && <p className="mt-1 text-xs text-brand" role="alert">{problems[i]}</p>}
          {(i === variants.length - 1 || variants[i + 1].name !== v.name || !v.name) && (
            <button type="button" className="mt-2 text-xs text-brand underline underline-offset-4 disabled:opacity-40" disabled={!v.name.trim()} onClick={() => addSubVariant(i)}>
              + Add sub-variant{v.name.trim() ? ` to ${v.name.trim()}` : ""}
            </button>
          )}
          </div>
          );
        })}
      </section>

      <section className="card space-y-3 bg-white p-5">
        <h2 className="font-serif text-2xl">Images</h2>
        <p className="text-xs text-taupe">Add as many photos as you like; pick several at once or one at a time. Use ← → to set the order customers see; the first is the main photo. New photos are added after the saved ones; once saved, you can move them anywhere. JPG, PNG or WebP.</p>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Photo ${i + 1}`} className={`h-24 w-24 rounded-lg object-cover ${i === 0 ? "ring-2 ring-brand" : ""}`} />
              <span className="absolute left-1 top-1 rounded bg-ivory/90 px-1.5 text-[10px] font-medium">{i === 0 ? "Main" : i + 1}</span>
              <button
                type="button"
                className="absolute right-1 top-1 rounded bg-ivory/90 px-1.5 text-xs text-brand"
                onClick={() => setImages((im) => im.filter((x) => x !== src))}
                aria-label={`Remove photo ${i + 1}`}
              >
                ✕
              </button>
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                <button type="button" className="step-btn rounded bg-ivory/90 px-1.5 text-xs disabled:opacity-30" disabled={i === 0} onClick={() => setImages((im) => moveItem(im, i, i - 1))} aria-label={`Move photo ${i + 1} left`}>
                  ←
                </button>
                {i > 0 && (
                  <button type="button" className="rounded bg-ivory/90 px-1.5 text-[10px]" onClick={() => setImages((im) => moveItem(im, i, 0))} aria-label={`Make photo ${i + 1} the main photo`}>
                    Main
                  </button>
                )}
                <button type="button" className="step-btn rounded bg-ivory/90 px-1.5 text-xs disabled:opacity-30" disabled={i === images.length - 1} onClick={() => setImages((im) => moveItem(im, i, i + 1))} aria-label={`Move photo ${i + 1} right`}>
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
        <ImageFileInput
          name="newImages"
          multiple
          onState={setUpload}
        />
      </section>

      {state?.error && <p className="text-sm text-brand" role="alert">{state.error}</p>}
      <button className="btn-primary px-10" disabled={pending || upload.busy}>{pending ? "Saving…" : upload.busy ? "Optimising photos…" : "Save product"}</button>
    </form>
  );
}
