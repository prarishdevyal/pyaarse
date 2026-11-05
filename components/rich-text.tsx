import { parseRichText, slugifyHeading, type Inline } from "@/lib/rich-text";

const inline = (parts: Inline[]) => parts.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>));

/** Renders admin-written text as React elements (never raw HTML). */
export function RichText({ source }: { source: string }) {
  return (
    <div className="prose-legal">
      {parseRichText(source).map((b, i) =>
        b.type === "h" ? (
          <h2 key={i} id={slugifyHeading(b.text)}>{b.text}</h2>
        ) : b.type === "ul" ? (
          <ul key={i}>{b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ul>
        ) : (
          <p key={i}>{inline(b.parts)}</p>
        ),
      )}
    </div>
  );
}
