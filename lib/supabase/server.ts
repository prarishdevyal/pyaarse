import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Supabase client acting as the signed-in user (session in cookies on the current host). */
export async function createSupabaseServerClient() {
  const jar = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) jar.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only; proxy.ts refreshes them.
        }
      },
    },
  });
}
