import { describe, expect, it } from "vitest";
import { canChangeStatus, isOrderStatus, shouldRestock } from "./order-status";

describe("order status rules", () => {
  it("validates statuses", () => {
    expect(isOrderStatus("paid")).toBe(true);
    expect(isOrderStatus("refunded")).toBe(false);
  });
  it("allows moving between active statuses", () => {
    expect(canChangeStatus("pending_payment", "paid")).toBe(true);
    expect(canChangeStatus("shipped", "paid")).toBe(true);
  });
  it("treats cancelled as final and ignores no-ops", () => {
    expect(canChangeStatus("cancelled", "paid")).toBe(false);
    expect(canChangeStatus("paid", "paid")).toBe(false);
  });
  it("restocks only when cancelling", () => {
    expect(shouldRestock("paid", "cancelled")).toBe(true);
    expect(shouldRestock("paid", "shipped")).toBe(false);
  });
});
