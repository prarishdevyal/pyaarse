import { describe, expect, it } from "vitest";
import { formatINR, orderNumberFor, slugify, toWhatsAppNumber } from "./format";

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
