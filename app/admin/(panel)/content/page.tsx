import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CONTENT_GROUPS } from "@/lib/content-defaults";
import { getContentOverrides } from "@/lib/content";
import { ContentForm } from "./content-form";

export const metadata = { title: "Site text" };

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAdmin();
  const { section } = await searchParams;
  const group = CONTENT_GROUPS.find((g) => g.id === section) ?? CONTENT_GROUPS[0];
  const overrides = await getContentOverrides();
  const edited = (id: string) => CONTENT_GROUPS.find((g) => g.id === id)!.fields.some((f) => f.key in overrides);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-brand">Site text</h1>
        <p className="mt-1 text-sm text-taupe">Change the words shown across the shop. Saved changes go live straight away.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Sections" className="flex gap-1 overflow-x-auto lg:flex-col">
          {CONTENT_GROUPS.map((g) => (
            <Link
              key={g.id}
              href={`/content?section=${g.id}`}
              aria-current={g.id === group.id ? "page" : undefined}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                g.id === group.id ? "bg-brand text-ivory" : "hover:bg-blush"
              }`}
            >
              {g.title}
              {edited(g.id) && <span className={`h-1.5 w-1.5 rounded-full ${g.id === group.id ? "bg-ivory" : "bg-brand"}`} title="Edited" />}
            </Link>
          ))}
        </nav>
        <ContentForm
          key={group.id}
          title={group.title}
          fields={group.fields.map((f) => ({ ...f, value: overrides[f.key] ?? f.default }))}
        />
      </div>
    </div>
  );
}
