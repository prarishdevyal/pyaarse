import { describe, expect, it } from "vitest";
import { cleanPhoneInput } from "./phone-input";
import { contactSchema } from "./validation";

describe("cleanPhoneInput", () => {
  it("drops letters and symbols", () => {
    expect(cleanPhoneInput("98a76-54 32b10")).toBe("9876543210");
    expect(cleanPhoneInput("abc")).toBe("");
  });
  it("stops at 10 digits", () => {
    expect(cleanPhoneInput("98765432109999")).toBe("9876543210");
  });
  it("keeps a +91, 91 or 0 prefix", () => {
    expect(cleanPhoneInput("+91 98765 43210")).toBe("+919876543210");
    expect(cleanPhoneInput("919876543210")).toBe("919876543210");
    expect(cleanPhoneInput("09876543210")).toBe("09876543210");
  });
  it("produces numbers the server accepts", () => {
    for (const raw of ["+91 98765 43210", "98765-43210", "09876543210"]) {
      expect(contactSchema.shape.phone.safeParse(cleanPhoneInput(raw)).success).toBe(true);
    }
  });
});
