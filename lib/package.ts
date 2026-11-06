/** Admin-only shipping details of a product option: packed weight (g) and box size (cm). */
export type PackageInfo = { weightGrams: number | null; lengthCm: number | null; widthCm: number | null; heightCm: number | null };

const num = (n: number) => String(Number(n.toFixed(1)));

/** "491 g · 24 × 16 × 6 cm", or what's known of it; null when nothing is filled in. */
export function describePackage(p: PackageInfo): string | null {
  const parts: string[] = [];
  if (p.weightGrams != null) parts.push(`${p.weightGrams} g`);
  if (p.lengthCm != null && p.widthCm != null && p.heightCm != null) parts.push(`${num(p.lengthCm)} × ${num(p.widthCm)} × ${num(p.heightCm)} cm`);
  return parts.length ? parts.join(" · ") : null;
}

/** Total packed weight of an order; `missing` counts lines without a weight so the total isn't trusted blindly. */
export function parcelWeight(lines: { quantity: number; pkg: PackageInfo | null }[]): { grams: number; missing: number } {
  let grams = 0;
  let missing = 0;
  for (const l of lines) {
    if (l.pkg?.weightGrams != null) grams += l.pkg.weightGrams * l.quantity;
    else missing++;
  }
  return { grams, missing };
}

/** Exact grams (what courier forms ask for), with kg alongside for heavier parcels: "1,270 g (1.27 kg)". */
export const formatWeight = (g: number) => (g >= 1000 ? `${g.toLocaleString("en-IN")} g (${Number((g / 1000).toFixed(2))} kg)` : `${g} g`);

/** Problem with an option's package fields, or null. All four may be empty; dimensions go together. */
export function packageProblem(p: PackageInfo): string | null {
  if (p.weightGrams != null && (!Number.isInteger(p.weightGrams) || p.weightGrams < 1 || p.weightGrams > 50000)) return "Weight must be a whole number of grams (1–50,000).";
  const dims = [p.lengthCm, p.widthCm, p.heightCm];
  const filled = dims.filter((d) => d != null).length;
  if (filled > 0 && filled < 3) return "Fill in all three box sizes (L × W × H), or leave them all empty.";
  if (dims.some((d) => d != null && !(d > 0 && d <= 500))) return "Box sizes must be between 0.1 and 500 cm.";
  return null;
}
