import { isPincode, parsePincodeResponse, type PincodePlace } from "@/lib/pincode";
import { clientIp, limits } from "@/lib/limits";

const MONTH = 30 * 24 * 3600;

/**
 * State and city for a pincode, for the checkout form. Looked up at India Post and cached for a month,
 * both here and by the browser/CDN. Never required: checkout works without it.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  if (!isPincode(pin)) return Response.json({ found: false }, { status: 400 });
  if (!(await limits.pincodeByIp.hit(await clientIp()))) return Response.json({ found: false }, { status: 429 });
  let place: PincodePlace | null = null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(5000), next: { revalidate: MONTH } });
    if (res.ok) place = parsePincodeResponse(await res.json());
  } catch {
    // India Post is slow or down: the customer just picks the state and city themselves.
    return Response.json({ found: false }, { status: 503 });
  }
  return Response.json(place ? { found: true, ...place } : { found: false }, {
    headers: { "Cache-Control": `public, max-age=86400, s-maxage=${MONTH}` },
  });
}
