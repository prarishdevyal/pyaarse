import { INDIA_STATES, STATE_NAMES } from "./india";

/** A valid Indian pincode: six digits, not starting with 0. */
export const isPincode = (s: string) => /^[1-9]\d{5}$/.test(s);

/** What a pincode tells us. city is one of our dropdown cities, or null when the district isn't in our list. */
export type PincodePlace = { state: string; city: string | null; district: string };

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

// India Post still uses some old names.
const CITY_ALIASES: Record<string, string> = {
  bangalore: "bengaluru", bangaloreurban: "bengaluru", bangalorerural: "bengaluru", gurgaon: "gurugram", bombay: "mumbai",
  mumbaicity: "mumbai", mumbaisuburban: "mumbai", calcutta: "kolkata", mysore: "mysuru", trivandrum: "thiruvananthapuram",
  thiruvananthapuram: "thiruvananthapuram", madras: "chennai", poona: "pune", baroda: "vadodara", allahabad: "prayagraj",
  newdelhi: "newdelhi", centraldelhi: "newdelhi", southdelhi: "newdelhi", northdelhi: "delhi", eastdelhi: "delhi", westdelhi: "delhi",
};

/** India Post's state name → ours (e.g. "Jammu & Kashmir" → "Jammu and Kashmir"; old "Daman and Diu" → the merged UT). */
export function matchState(name: string): string | null {
  const n = norm(name);
  if (!n) return null;
  return STATE_NAMES.find((s) => norm(s) === n) ?? STATE_NAMES.find((s) => norm(s).includes(n) || n.includes(norm(s))) ?? null;
}

/** The first of the candidate place names that is a city in our list for that state. */
export function matchCity(state: string, candidates: string[]): string | null {
  const cities = INDIA_STATES[state] ?? [];
  for (const c of candidates) {
    const n = CITY_ALIASES[norm(c)] ?? norm(c);
    const hit = cities.find((city) => norm(city) === n);
    if (hit) return hit;
  }
  return null;
}

type PostOffice = { Name?: string; District?: string; State?: string; Block?: string; Division?: string; Region?: string };

/** Reads India Post's answer (api.postalpincode.in). Null when the pincode isn't known. */
export function parsePincodeResponse(json: unknown): PincodePlace | null {
  const first = Array.isArray(json) ? json[0] : null;
  const offices: PostOffice[] = first?.Status === "Success" && Array.isArray(first.PostOffice) ? first.PostOffice : [];
  const o = offices.find((p) => p.State && p.District);
  if (!o) return null;
  const state = matchState(o.State!);
  if (!state) return null;
  const candidates = [o.District!, ...offices.flatMap((p) => [p.Block, p.Division, p.Region, p.Name])].filter((x): x is string => !!x);
  return { state, city: matchCity(state, candidates), district: o.District! };
}
