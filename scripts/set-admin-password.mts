// Sets the admin password from ADMIN_PASSWORD and signs the admin out everywhere.
// Usage (Docker): docker compose exec app npm run admin:password
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { adminPasswordProblem } from "../lib/admin-bootstrap";

const email = process.env.ADMIN_EMAIL?.toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
for (const k of ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "ADMIN_EMAIL"]) {
  if (!process.env[k]) throw new Error(`${k} is not set`);
}
const problem = adminPasswordProblem(password);
if (problem) {
  console.error(`✗ ${problem}`);
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
const user = data?.users.find((u) => u.email?.toLowerCase() === email && u.app_metadata?.role === "admin");
if (!user) {
  console.error(`✗ no admin account with email ${email}`);
  process.exit(1);
}
const { error } = await admin.auth.admin.updateUserById(user.id, { password });
if (error) throw new Error(error.message);

// Revoke existing sessions (refresh tokens go with them).
const local = /@(localhost|127\.0\.0\.1|db)(:\d+)?\//.test(process.env.DATABASE_URL!);
const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: local ? false : "require" });
await sql`delete from auth.sessions where user_id = ${user.id}`;
await sql.end();
console.log(`✓ admin password updated for ${email}; existing sessions signed out`);
