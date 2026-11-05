import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { clientOptions } from "../lib/db/options";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const client = postgres(process.env.DATABASE_URL, { ...clientOptions(process.env.DATABASE_URL), max: 1 });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.end();
console.log("✓ migrations applied");
