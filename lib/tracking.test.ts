import { describe, expect, it } from "vitest";
import { canShip, contactMatches, delhiveryTrackingUrl, isValidAwb, normalizeAwb, trackSteps } from "./tracking";

describe("Delhivery waybills", () => {
  it("normalises and validates", () => {
    expect(normalizeAwb(" 1234 5678-90123 ")).toBe("1234567890123");
    expect(isValidAwb("1234567890123")).toBe(true);
    expect(isValidAwb("12")).toBe(false);
    expect(isValidAwb("12345<script>")).toBe(false);
  });
  it("links to Delhivery's tracking page", () => {
    expect(delhiveryTrackingUrl("1234567890123")).toBe("https://www.delhivery.com/track-v2/package/1234567890123");
  });
});

describe("trackSteps", () => {
  it("marks steps up to the current status", () => {
    expect(trackSteps("paid").map((s) => [s.key, s.done, s.current])).toEqual([
      ["placed", true, false], ["paid", true, true], ["shipped", false, false], ["delivered", false, false],
    ]);
    expect(trackSteps("pending_payment")[0].current).toBe(true);
    expect(trackSteps("delivered").every((s) => s.done)).toBe(true);
    expect(trackSteps("cancelled").some((s) => s.done)).toBe(false);
  });
});

describe("contactMatches", () => {
  const o = { email: "Asha@Example.com", phone: "98765 43210" };
  it("accepts the checkout email or phone in any format", () => {
    expect(contactMatches(o, "asha@example.com")).toBe(true);
    expect(contactMatches(o, "+91 98765-43210")).toBe(true);
    expect(contactMatches(o, "09876543210")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(contactMatches(o, "other@example.com")).toBe(false);
    expect(contactMatches(o, "9876500000")).toBe(false);
    expect(contactMatches(o, "43210")).toBe(false);
    expect(contactMatches(o, "")).toBe(false);
  });
});

describe("canShip", () => {
  it("allows tracking only once paid", () => {
    expect(canShip("pending_payment")).toBe(false);
    expect(canShip("cancelled")).toBe(false);
    expect(canShip("paid")).toBe(true);
    expect(canShip("shipped")).toBe(true);
    expect(canShip("delivered")).toBe(true);
  });
});
