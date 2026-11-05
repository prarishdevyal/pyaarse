import { describe, expect, it } from "vitest";
import { confirmRedirect } from "./confirm-redirect";

describe("confirmRedirect", () => {
  it("continues signed in with a verified note", () => {
    expect(confirmRedirect("signed-in", "/account")).toBe("/account?verified=1");
    expect(confirmRedirect("signed-in", "/shop?collection=gifts")).toBe("/shop?collection=gifts&verified=1");
  });
  it("asks people who opened the link in another browser to log in", () => {
    expect(confirmRedirect("verified-other-browser", "/checkout")).toBe("/login?confirm=verified&next=%2Fcheckout");
  });
  it("reports dead links", () => {
    expect(confirmRedirect("failed", "/account")).toBe("/login?confirm=failed&next=%2Faccount");
  });
});
