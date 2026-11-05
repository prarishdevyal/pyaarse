import { describe, expect, it } from "vitest";
import { requestHost, routeFor } from "./hosts";

describe("routeFor", () => {
  it("maps admin subdomain paths into /admin", () => {
    expect(routeFor("admin.pyaarse.net", "/")).toBe("/admin");
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
