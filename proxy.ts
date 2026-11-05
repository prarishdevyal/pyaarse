import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { requestHost, routeFor } from "./lib/hosts";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const target = routeFor(requestHost(request.headers), pathname);
  if (target === null) return new NextResponse("Not found", { status: 404 });

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = target;
  const respond = () =>
    target === pathname ? NextResponse.next({ request }) : NextResponse.rewrite(rewriteUrl, { request });

  let response = respond();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  // Refresh the Supabase session cookie so server components see a valid login.
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = respond();
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/|placeholders/|brand/|icon.png|apple-icon.png|favicon.ico).*)"],
};
