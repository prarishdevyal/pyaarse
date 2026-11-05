import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseSecretKey, supabaseUrl } from "./env";

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Secret-key client: bypasses RLS and can manage users. Server only, never send to the browser. */
export const supabaseAdmin = () => createClient(supabaseUrl(), supabaseSecretKey(), noSession);

/** Stateless publishable-key client, e.g. to check a password without creating a cookie session. */
export const supabaseStateless = () => createClient(supabaseUrl(), supabasePublishableKey(), noSession);
