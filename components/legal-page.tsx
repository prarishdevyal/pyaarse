import { getContent } from "@/lib/content";
import { parseRichText, slugifyHeading } from "@/lib/rich-text";
import { RichText } from "./rich-text";

export async function LegalPage({ title, contentKey }: { title: string; contentKey: string }) {
  const t = await getContent();
  const source = t(contentKey);
  const headings = parseRichText(source).flatMap((b) => (b.type === "h" ? [b.text] : []));
  return (
    <div className="container-page py-14">
      <header className="max-w-[68ch]">
        <h1 className="heading-section">{title}</h1>
        <p className="mt-2 text-sm text-taupe">Last updated {t("legal.updated")}</p>
      </header>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
        <RichText source={source} />
        {headings.length > 2 && (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-32 border-l border-sand pl-4 text-sm">
              <p className="mb-3 font-medium">On this page</p>
              <ul className="space-y-2 text-taupe">
                {headings.map((h) => (
                  <li key={h}><a href={`#${slugifyHeading(h)}`} className="hover:text-brand">{h}</a></li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
