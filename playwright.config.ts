import { defineConfig, devices } from "@playwright/test";

// Read-only checks against a running site. Defaults to local Docker; CI points it at production.
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const ADMIN_URL = process.env.E2E_ADMIN_URL ?? "http://admin.localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL: BASE_URL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
