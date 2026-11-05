import { describe, expect, it } from "vitest";
import { isAdminHost, requestHost, routeFor, siteUrl } from "./hosts";

describe("routeFor", () => {
  const env = {};
  it("maps admin subdomain paths into /admin", () => {
    expect(routeFor("admin.pyaarse.net", "/", env)).toBe("/admin");
    expect(routeFor("admin.localhost:3000", "/orders/5")).toBe("/admin/orders/5");
  });
  it("hides /admin on the main site", () => {
    expect(routeFor("pyaarse.net", "/admin")).toBeNull();
    expect(routeFor("localhost:3000", "/admin/orders")).toBeNull();
  });
  it("leaves storefront paths alone", () => {
    expect(routeFor("pyaarse.net", "/shop")).toBe("/shop");
    expect(routeFor("www.pyaarse.net", "/administrator-tips")).toBe("/administrator-tips");
  });
});

describe("requestHost", () => {
  it("prefers x-forwarded-host (internal redirects, reverse proxies)", () => {
    expect(requestHost(new Headers({ host: "0.0.0.0:3000", "x-forwarded-host": "admin.pyaarse.net" }))).toBe("admin.pyaarse.net");
    expect(requestHost(new Headers({ host: "x", "x-forwarded-host": "admin.pyaarse.net, proxy" }))).toBe("admin.pyaarse.net");
  });
  it("falls back to host", () => {
    expect(requestHost(new Headers({ host: "pyaarse.net" }))).toBe("pyaarse.net");
  });
});

describe("isAdminHost", () => {
  const env = { ADMIN_URL: "https://pyaarse-admin.vercel.app", SITE_URL: "https://pyaarse.vercel.app" };
  it("accepts admin.* and the exact ADMIN_URL host", () => {
    expect(isAdminHost("admin.pyaarse.net", {})).toBe(true);
    expect(isAdminHost("pyaarse-admin.vercel.app", env)).toBe(true);
    expect(isAdminHost("PYAARSE-ADMIN.vercel.app", env)).toBe(true);
  });
  it("rejects the shop and lookalike hosts", () => {
    expect(isAdminHost("pyaarse.vercel.app", env)).toBe(false);
    expect(isAdminHost("pyaarse-admin.vercel.app.evil.com", env)).toBe(false);
    expect(isAdminHost(null, env)).toBe(false);
  });
  it("ignores an ADMIN_URL that points at the shop itself", () => {
    expect(isAdminHost("pyaarse.vercel.app", { ADMIN_URL: "https://pyaarse.vercel.app", SITE_URL: "https://pyaarse.vercel.app" })).toBe(false);
  });
  it("ignores a malformed ADMIN_URL", () => {
    expect(isAdminHost("anything", { ADMIN_URL: "not a url" })).toBe(false);
  });
});

describe("siteUrl", () => {
  it("prefers SITE_URL and trims the trailing slash", () => {
    expect(siteUrl({ SITE_URL: "https://pyaarse.net/", VERCEL_PROJECT_PRODUCTION_URL: "pyaarse.vercel.app" })).toBe("https://pyaarse.net");
  });
  it("falls back to the Vercel production domain, then localhost", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "pyaarse.vercel.app" })).toBe("https://pyaarse.vercel.app");
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});
