/** How an option is shown to customers, in the cart and on orders: "Box of 4 · Rose", or just "Box of 4". */
export const variantLabel = (name: string, subName: string | null | undefined) => (subName?.trim() ? `${name} · ${subName.trim()}` : name);

/** Option rows grouped by variant name, in their saved order: [{ name: "Box of 4", options: [Rose, Lavender] }, …]. */
export function groupVariants<T extends { name: string }>(rows: T[]): { name: string; options: T[] }[] {
  const groups: { name: string; options: T[] }[] = [];
  for (const r of rows) {
    const g = groups.find((x) => x.name === r.name);
    if (g) g.options.push(r);
    else groups.push({ name: r.name, options: [r] });
  }
  return groups;
}
