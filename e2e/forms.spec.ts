import { expect, test } from "@playwright/test";
import { ADMIN_URL, openInStockProduct, watchPosts } from "./helpers";

// Every test submits invalid data only, so nothing is ever saved, sent or emailed.

test("checkout flags every empty field and sends nothing", async ({ page }) => {
  const add = await openInStockProduct(page);
  await add.click();
  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: "Place order" })).toBeEnabled();
  const posts = watchPosts(page);
  await page.getByRole("button", { name: "Place order" }).click();
  for (const msg of ["Please enter your name", "Please enter a valid email", "Please enter a valid 10-digit mobile number", "Please enter your full address", "Please choose your state", "Pincode must be 6 digits"]) {
    await expect(page.getByText(msg)).toBeVisible();
  }
  expect(posts.filter((u) => u.includes("/checkout"))).toEqual([]);
});

test("checkout city list follows the chosen state, with an Other option", async ({ page }) => {
  const add = await openInStockProduct(page);
  await add.click();
  await page.goto("/checkout");
  const city = page.getByLabel("City");
  await expect(city).toBeDisabled();
  await page.getByLabel("State").selectOption("Maharashtra");
  await expect(city).toBeEnabled();
  await expect(city.locator("option", { hasText: /^Mumbai$/ })).toHaveCount(1);
  await city.selectOption({ label: "Other (type it)" });
  await expect(page.getByPlaceholder("Type your city or town")).toBeVisible();
});

test("checkout fixes errors as you type", async ({ page }) => {
  const add = await openInStockProduct(page);
  await add.click();
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Pincode must be 6 digits")).toBeVisible();
  await page.getByLabel("Pincode").fill("400001");
  await expect(page.getByText("Pincode must be 6 digits")).toHaveCount(0);
});

test("contact form validates and sends nothing when empty", async ({ page }) => {
  await page.goto("/contact");
  const posts = watchPosts(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByLabel("Your name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Message")).toHaveAttribute("aria-invalid", "true");
  expect(posts).toEqual([]);
});

test("WhatsApp number boxes take digits only and flag short numbers", async ({ page }) => {
  await page.goto("/contact");
  const posts = watchPosts(page);
  const phone = page.getByLabel(/WhatsApp number/);
  await phone.pressSequentially("98ab76-54x");
  await expect(phone).toHaveValue("987654");
  await phone.blur();
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await phone.fill("");
  await phone.pressSequentially("9876543210999");
  await expect(phone).toHaveValue("9876543210");
  await expect(phone).not.toHaveAttribute("aria-invalid", "true");
  expect(posts).toEqual([]);
});

test("login and register forms validate before sending", async ({ page }) => {
  for (const [path, button] of [["/login", "Log in"], ["/register", /Create/]] as const) {
    await page.goto(path);
    const posts = watchPosts(page);
    await page.getByRole("button", { name: button }).click();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    expect(posts, path).toEqual([]);
  }
});

test("admin login validates before sending", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/login`);
  const posts = watchPosts(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  expect(posts).toEqual([]);
});
