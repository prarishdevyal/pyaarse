import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/redirect";
import { confirmRedirect, type ConfirmResult } from "@/lib/confirm-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Landing page for Supabase email links (sign-up confirmation). Signs the person in when it can. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  let result: ConfirmResult = "failed";
  if (!params.get("error_code")) {
    const supabase = await createSupabaseServerClient();
    if (tokenHash && type) {
      // Works in any browser: verifies the email and signs in.
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      result = error ? "failed" : "signed-in";
    } else if (code) {
      // Supabase has already confirmed the email to get here; the code only signs in the browser that registered.
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      result = error ? "verified-other-browser" : "signed-in";
    }
  }
  redirect(confirmRedirect(result, next));
}
