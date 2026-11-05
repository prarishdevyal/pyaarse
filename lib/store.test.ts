import { describe, expect, it } from "vitest";
import { instagramHandle, storeContact } from "./store";

describe("storeContact", () => {
  it("builds a WhatsApp link with an encoded message", () => {
    expect(storeContact({ STORE_WHATSAPP: "+91 98765 43210" }).whatsappLink("Hi & hello")).toBe("https://wa.me/919876543210?text=Hi%20%26%20hello");
  });
  it("has no WhatsApp link without a number and sane defaults", () => {
    const c = storeContact({ STORE_INSTAGRAM: "@pyaarse.candles" });
    expect(c.whatsappLink("x")).toBeNull();
    expect(c.instagram).toBe("pyaarse.candles");
    expect(c.email).toBe("query@pyaarse.net");
  });
  it("defaults to the shop's Instagram", () => expect(storeContact({}).instagram).toBe("pyaarse_net"));
  it("reads a handle however it's written", () => {
    for (const raw of ["pyaarse_net", "@pyaarse_net", "instagram.com/pyaarse_net", "https://www.instagram.com/pyaarse_net/?hl=en"]) {
      expect(instagramHandle(raw)).toBe("pyaarse_net");
    }
  });
});
