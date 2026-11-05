function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export const supabaseUrl = () => need("SUPABASE_URL");
export const supabasePublishableKey = () => need("SUPABASE_PUBLISHABLE_KEY");
export const supabaseSecretKey = () => need("SUPABASE_SECRET_KEY");
