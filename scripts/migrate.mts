import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const local = /@(localhost|127\.0\.0\.1|db)(:\d+)?\//.test(process.env.DATABASE_URL);
const client = postgres(process.env.DATABASE_URL, { max: 1, ssl: local ? false : "require" });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.end();
console.log("✓ migrations applied");
