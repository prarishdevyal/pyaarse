import { describe, expect, it } from "vitest";
import { canChangeStatus, isOrderStatus, isPaid, shouldRestock, statusesFor } from "./order-status";

describe("order status rules", () => {
  it("validates statuses", () => {
    expect(isOrderStatus("paid")).toBe(true);
    expect(isOrderStatus("cod")).toBe(true);
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

describe("Cash on Delivery statuses", () => {
  it("keeps 'to collect' for COD orders and 'awaiting payment'/'paid' for online ones", () => {
    expect(statusesFor("cod")).toEqual(["cod", "shipped", "delivered", "cancelled"]);
    expect(statusesFor("online")).toEqual(["pending_payment", "paid", "shipped", "delivered", "cancelled"]);
    expect(canChangeStatus("cod", "shipped", "cod")).toBe(true);
    expect(canChangeStatus("shipped", "cod", "cod")).toBe(true);
    expect(canChangeStatus("cod", "paid", "cod")).toBe(false);
    expect(canChangeStatus("paid", "cod", "online")).toBe(false);
  });
  it("counts a COD order as paid only once delivered", () => {
    expect(isPaid("cod", "cod")).toBe(false);
    expect(isPaid("shipped", "cod")).toBe(false);
    expect(isPaid("delivered", "cod")).toBe(true);
    expect(isPaid("pending_payment", "online")).toBe(false);
    expect(isPaid("shipped", "online")).toBe(true);
  });
});
