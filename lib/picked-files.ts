/** Adds newly picked files to the ones already chosen, skipping exact repeats (same name, size and date). */
export function mergePicked<T extends { name: string; size: number; lastModified: number }>(current: T[], picked: T[]): T[] {
  const key = (f: T) => `${f.name}|${f.size}|${f.lastModified}`;
  const seen = new Set(current.map(key));
  return [...current, ...picked.filter((f) => !seen.has(key(f)) && seen.add(key(f)))];
}
