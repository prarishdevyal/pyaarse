import { describe, expect, it } from "vitest";
import { fieldError, formErrors } from "./form-errors";
import { checkoutFieldsShape, contactSchema, registerSchema } from "./validation";

describe("client-side field validation", () => {
  it("reports the same messages as the server schema", () => {
    expect(fieldError(checkoutFieldsShape, "phone", "12345")).toBe("Please enter a valid 10-digit mobile number");
    expect(fieldError(checkoutFieldsShape, "phone", "98765 43210")).toBeUndefined();
    expect(fieldError(checkoutFieldsShape, "pincode", "4110")).toBe("Pincode must be 6 digits");
    expect(fieldError(checkoutFieldsShape, "state", "")).toBe("Please choose your state");
  });
  it("collects every invalid field", () => {
    const errs = formErrors(registerSchema.shape, { name: "", email: "nope", password: "short" });
    expect(Object.keys(errs).sort()).toEqual(["email", "name", "password"]);
  });
  it("passes valid contact input", () => {
    expect(formErrors(contactSchema.shape, { name: "Asha", email: "a@b.co", phone: "", message: "Hello there, a question.", website: "" })).toEqual({});
  });
  it("ignores unknown fields", () => expect(fieldError(contactSchema.shape, "nope", "x")).toBeUndefined());
});
