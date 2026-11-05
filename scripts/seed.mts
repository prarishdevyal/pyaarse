import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { adminPasswordProblem, decideAdminBootstrap, EXAMPLE_ADMIN_PASSWORDS } from "../lib/admin-bootstrap";
import { IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES } from "../lib/images";

for (const k of ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_PUBLISHABLE_KEY"]) {
  if (!process.env[k]) throw new Error(`${k} is not set`);
}
const local = /@(localhost|127\.0\.0\.1|db)(:\d+)?\//.test(process.env.DATABASE_URL!);
const client = postgres(process.env.DATABASE_URL!, { max: 1, ssl: local ? false : "require" });
const db = drizzle(client, { schema });
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, noSession);
const passwordWorks = async (email: string, password: string) => {
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, noSession);
  const { error } = await anon.auth.signInWithPassword({ email, password });
  return !error;
};

// Storage bucket for product photos (public read; only the server can write).
const { data: bucket } = await admin.storage.getBucket(IMAGE_BUCKET);
if (!bucket) {
  const { error } = await admin.storage.createBucket(IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: Object.keys(IMAGE_TYPES),
  });
  if (error) throw new Error(`could not create bucket: ${error.message}`);
  console.log(`✓ storage bucket created: ${IMAGE_BUCKET}`);
}

// Admin user: a Supabase Auth user with app_metadata.role = "admin". Existing accounts are never silently taken over.
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
if (adminEmail && adminPassword) {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(`could not list users: ${listError.message}`);
  const existing = list.users.find((u) => u.email?.toLowerCase() === adminEmail);
  const action = decideAdminBootstrap(
    existing
      ? { role: existing.app_metadata?.role === "admin" ? "admin" : "customer", passwordMatches: await passwordWorks(adminEmail, adminPassword) }
      : null,
    adminPassword,
  );
  switch (action) {
    case "create": {
      const { error } = await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        app_metadata: { role: "admin" },
        user_metadata: { name: "Pyaarse Admin" },
      });
      if (error) throw new Error(`could not create admin: ${error.message}`);
      console.log(`✓ admin user created: ${adminEmail}`);
      break;
    }
    case "promote":
      await admin.auth.admin.updateUserById(existing!.id, { app_metadata: { role: "admin" } });
      console.log(`✓ promoted ${adminEmail} to admin (ADMIN_PASSWORD signs in to it)`);
      break;
    case "refuse-weak-password":
      console.error(`✗ ${adminPasswordProblem(adminPassword)} — admin NOT created. Set a strong ADMIN_PASSWORD in .env and restart.`);
      break;
    case "refuse-unverified-account":
      console.error(`✗ ${adminEmail} is already registered and ADMIN_PASSWORD does not sign in to it — NOT promoting it. Use another ADMIN_EMAIL or resolve it in Supabase.`);
      break;
    case "keep-admin":
      for (const p of EXAMPLE_ADMIN_PASSWORDS) {
        if (await passwordWorks(adminEmail, p)) console.error(`✗ WARNING: admin ${adminEmail} still uses the example password. Run: npm run admin:password`);
      }
      break;
  }
} else {
  console.warn("! ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin user created");
}

// Sample catalog: only on an empty database.
const anyCollection = await db.query.collections.findFirst();
if (!anyCollection) {
  const cols = await db
    .insert(schema.collections)
    .values([
      { name: "Signature Collection", slug: "signature", tagline: "Our most loved candles.", image: "/placeholders/collection-1.jpg", sortOrder: 1 },
      { name: "Floral Collection", slug: "floral", tagline: "Fresh, floral and uplifting.", image: "/placeholders/collection-2.jpg", sortOrder: 2 },
      { name: "Aromatic Collection", slug: "aromatic", tagline: "Grounding and calming blends.", image: "/placeholders/collection-3.jpg", sortOrder: 3 },
      { name: "Gifting", slug: "gifting", tagline: "Thoughtful hampers for your loved ones.", image: "/placeholders/collection-4.jpg", sortOrder: 4 },
    ])
    .returning();
  const col = Object.fromEntries(cols.map((c) => [c.slug, c.id]));

  const samples: { name: string; collection: string; bestseller: boolean; description: string; variants: [string, number, number][] }[] = [
    { name: "Rose Candle", collection: "signature", bestseller: true, description: "Soft Bulgarian rose with a warm vanilla base. Hand-poured soy wax, cotton wick.", variants: [["100g", 349, 20], ["200g", 499, 15]] },
    { name: "Oud & Amber", collection: "signature", bestseller: true, description: "Rich oud wrapped in golden amber — cosy, deep and long-lasting.", variants: [["200g", 649, 10], ["300g", 849, 3]] },
    { name: "Jasmine Bloom", collection: "floral", bestseller: true, description: "Night-blooming jasmine with a hint of green tea.", variants: [["100g", 349, 12], ["200g", 499, 8]] },
    { name: "Lavender Calm", collection: "aromatic", bestseller: true, description: "French lavender and chamomile to help you unwind.", variants: [["200g", 549, 0], ["300g", 749, 6]] },
    { name: "Sandalwood Serenity", collection: "aromatic", bestseller: false, description: "Creamy sandalwood with soft musk.", variants: [["200g", 599, 9]] },
    { name: "Love Hamper", collection: "gifting", bestseller: true, description: "Two 100g candles of your choice in a ribbon-tied gift box with a handwritten note.", variants: [["Rose + Jasmine", 999, 5], ["Oud + Lavender", 1099, 5]] },
  ];
  for (const s of samples) {
    const [p] = await db
      .insert(schema.products)
      .values({
        name: s.name,
        slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        description: s.description,
        collectionId: col[s.collection],
        isBestseller: s.bestseller,
      })
      .returning();
    await db.insert(schema.productVariants).values(
      s.variants.map(([name, price, stock], i) => ({ productId: p.id, name, price, stock, sortOrder: i })),
    );
  }
  console.log(`✓ seeded ${cols.length} collections and ${samples.length} sample products`);
}

await client.end();
