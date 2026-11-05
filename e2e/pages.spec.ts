import { expect, test } from "@playwright/test";
import { ADMIN_URL, BASE_URL } from "./helpers";

const PAGES = ["/", "/shop", "/cart", "/checkout", "/contact", "/login", "/register", "/about", "/privacy", "/terms", "/wishlist"];

test.describe("every page responds", () => {
  for (const path of PAGES) {
    test(`${path} returns 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${BASE_URL}${path}`).toBe(200);
    });
  }

  test("unknown pages return 404", async ({ request }) => {
    expect((await request.get("/this-page-does-not-exist")).status()).toBe(404);
  });

  test("account needs a login", async ({ request }) => {
    const res = await request.get("/account", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toContain("/login");
  });
});

test.describe("admin stays separate", () => {
  test("the shop host hides /admin", async ({ request }) => {
    expect((await request.get("/admin")).status()).toBe(404);
    expect((await request.get("/admin/orders")).status()).toBe(404);
  });

  test("admin pages redirect to the admin login when signed out", async ({ request }) => {
    for (const path of ["/", "/orders", "/products", "/settings", "/content", "/messages"]) {
      const res = await request.get(`${ADMIN_URL}${path}`, { maxRedirects: 0 });
      expect([302, 303, 307, 308], `${ADMIN_URL}${path}`).toContain(res.status());
      expect(res.headers()["location"]).toMatch(/\/login$/);
    }
  });

  test("the admin login page loads", async ({ request }) => {
    expect((await request.get(`${ADMIN_URL}/login`)).status()).toBe(200);
  });
});

test.describe("protected endpoints", () => {
  test("the keep-alive endpoint rejects requests without the cron secret", async ({ request }) => {
    expect((await request.get("/api/keepalive")).status()).toBe(401);
    expect((await request.get("/api/keepalive", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  });
});

test.describe("production only", () => {
  test.skip(!BASE_URL.startsWith("https://"), "needs the live HTTPS site");

  test("sends HSTS", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["strict-transport-security"]).toContain("max-age=");
  });
});
