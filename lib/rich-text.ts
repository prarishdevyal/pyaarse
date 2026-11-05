/** A tiny, safe text format for admin-written pages: "## heading", "- bullet", blank-line paragraphs, **bold**. */
export type Inline = { text: string; bold: boolean };
export type Block = { type: "h"; text: string } | { type: "p"; parts: Inline[] } | { type: "ul"; items: Inline[][] };

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last) out.push({ text: s.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false });
  return out;
}

export function parseRichText(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: Inline[][] | null = null;
  const flush = () => {
    if (para.length) blocks.push({ type: "p", parts: parseInline(para.join(" ")) });
    if (list) blocks.push({ type: "ul", items: list });
    para = [];
    list = null;
  };
  for (const raw of src.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("## ")) { flush(); blocks.push({ type: "h", text: line.slice(3).trim() }); continue; }
    if (/^[-*] /.test(line)) {
      if (para.length) { blocks.push({ type: "p", parts: parseInline(para.join(" ")) }); para = []; }
      (list ??= []).push(parseInline(line.slice(2).trim()));
      continue;
    }
    if (list) { blocks.push({ type: "ul", items: list }); list = null; }
    para.push(line);
  }
  flush();
  return blocks;
}

export const slugifyHeading = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
