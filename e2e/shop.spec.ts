import { expect, test } from "@playwright/test";
import { failOnPageErrors, openInStockProduct } from "./helpers";

test("home page shows the hero, collections and footer", async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pyaarse home" })).toBeVisible();
  await expect(page.locator("footer")).toContainText("Pyaarse");
  await expect(page.getByRole("link", { name: /Privacy/ }).first()).toBeAttached();
  noErrors();
});

test("shop lists products with prices", async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  await page.goto("/shop");
  await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  await expect(page.getByText("₹").first()).toBeVisible();
  noErrors();
});

test("add to cart updates the badge and the cart page", async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  const add = await openInStockProduct(page);
  const name = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await add.click();
  await expect(page.getByRole("status")).toContainText("Added to your cart");
  await expect(page.getByRole("link", { name: "Cart", exact: true })).toContainText("1");

  await page.goto("/cart");
  await expect(page.getByText(name).first()).toBeVisible();
  await expect(page.getByText(/Subtotal/i).first()).toBeVisible();
  noErrors();
});

test("cart survives a page refresh", async ({ page }) => {
  const add = await openInStockProduct(page);
  await add.click();
  await page.reload();
  await expect(page.getByRole("link", { name: "Cart", exact: true })).toContainText("1");
});

test("wishlist heart toggles on a product", async ({ page }) => {
  await openInStockProduct(page);
  const heart = page.getByRole("button", { name: "Wishlist" });
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
});
