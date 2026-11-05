import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");

describe("deployment config", () => {
  const compose = read("./docker-compose.yml");

  it("publishes Mailpit on this machine only and no database port", () => {
    const published = [...compose.matchAll(/^\s*-\s*"([^"]+)"/gm)].map((m) => m[1]);
    expect(published).toContain("127.0.0.1:8025:8025");
    expect(published).toContain("127.0.0.1:1025:1025");
    expect(published.some((p) => p.endsWith("5432"))).toBe(false);
  });

  it("keeps secrets and email settings in .env, not the compose file", () => {
    expect(compose).not.toMatch(/^\s*(DATABASE_URL|SMTP_HOST|SMTP_PORT|SUPABASE_\w+|RESEND_API_KEY):/m);
    expect(compose).not.toMatch(/postgres(ql)?:\/\//);
  });

  it("binds next dev to localhost and disables the dev MCP endpoint", () => {
    expect(JSON.parse(read("./package.json")).scripts.dev).toBe("next dev -H 127.0.0.1");
    expect(read("./next.config.ts")).toMatch(/mcpServer:\s*false/);
  });

  it("keeps local env files out of git and the Docker image", () => {
    expect(read("./.gitignore")).toMatch(/^\.env\*$/m);
    expect(read("./.dockerignore")).toMatch(/^\.env\*$/m);
  });
});
