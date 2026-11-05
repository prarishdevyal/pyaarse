import { describe, expect, it } from "vitest";
import { formatINR, orderNumberFor, slugify, toWhatsAppNumber, formatDate, formatDateTime, startOfIndianDay } from "./format";

describe("format", () => {
  it("formats rupees with Indian grouping", () => expect(formatINR(125000)).toBe("₹1,25,000"));
  it("builds order numbers", () => expect(orderNumberFor(42)).toBe("PY1042"));
  it("slugifies names", () => expect(slugify("  Rose & Oud Candle! ")).toBe("rose-oud-candle"));
  it("normalises WhatsApp numbers", () => {
    expect(toWhatsAppNumber("98765 43210")).toBe("919876543210");
    expect(toWhatsAppNumber("09876543210")).toBe("919876543210");
    expect(toWhatsAppNumber("+91 98765-43210")).toBe("919876543210");
  });
});

describe("India time", () => {
  it("shows order times in IST, not the server's UTC", () => {
    const d = new Date("2026-11-05T12:24:22Z");
    expect(formatDateTime(d)).toMatch(/5 Nov 2026.*5:54\s?pm/i);
    expect(formatDate(new Date("2026-11-05T20:00:00Z"))).toBe("6 Nov 2026");
  });
  it("starts the day at midnight India time", () => {
    expect(startOfIndianDay(new Date("2026-11-05T12:00:00Z")).toISOString()).toBe("2026-11-04T18:30:00.000Z");
    expect(startOfIndianDay(new Date("2026-11-05T19:00:00Z")).toISOString()).toBe("2026-11-05T18:30:00.000Z");
    expect(startOfIndianDay(new Date("2026-11-05T18:29:00Z")).toISOString()).toBe("2026-11-04T18:30:00.000Z");
  });
});
