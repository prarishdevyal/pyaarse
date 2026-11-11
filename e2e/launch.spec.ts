import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL, failOnPageErrors, openInStockProduct } from "./helpers";

/**
 * Launch check: a real order on the live site, end to end. It WRITES data and SENDS emails/Telegram,
 * so it only runs on purpose: `npm run test:launch` (reads logins from .env.e2e, which git ignores).
 *
 *   customer logs in → buys one in-stock item → admin opens the order → invoice PDF loads →
 *   marks it Paid (sends the invoice email; the page must say it was emailed) → cancels it (stock returns).
 */
const env = {
  customerEmail: process.env.E2E_CUSTOMER_EMAIL ?? "",
  customerPassword: process.env.E2E_CUSTOMER_PASSWORD ?? "",
  adminEmail: process.env.E2E_ADMIN_EMAIL ?? "",
  adminPassword: process.env.E2E_ADMIN_PASSWORD ?? "",
};

test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_LAUNCH, "Launch check runs only via `npm run test:launch`");
test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== "desktop", "Desktop only"));

let orderNumber = "";
let placed = false;

async function logIn(page: Page, url: string, email: string, password: string, button: RegExp) {
  await page.goto(url);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: button }).click();
}

test("customer places an order", async ({ page }) => {
  expect(env.customerEmail && env.customerPassword, "set E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD in .env.e2e").toBeTruthy();
  const noErrors = failOnPageErrors(page);

  await logIn(page, "/login", env.customerEmail, env.customerPassword, /^Log in$/);
  await expect(page, "customer login failed: check the test account's email and password").toHaveURL(/\/account/);

  const add = await openInStockProduct(page);
  await add.click();
  await expect(page.getByRole("link", { name: "View cart", exact: true })).toBeVisible();

  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Launch Test");
  await page.getByLabel("WhatsApp number").fill("9876543210");
  await page.getByLabel("Address").fill("Launch test order, please ignore");
  await page.getByLabel("State").selectOption("Maharashtra");
  await page.getByLabel("City").selectOption({ index: 1 });
  await page.getByLabel("Pincode").fill("411001");
  await expect(page.getByText("Total")).toBeVisible();
  await page.getByRole("button", { name: /^Place order/ }).click();

  // Checkout goes straight to Cashfree's payment page (or to the order page if it couldn't open).
  await page.waitForURL((url) => /cashfree\.com$/.test(url.hostname) || url.pathname === "/order-confirmed", { timeout: 30_000 });
  placed = true;
  noErrors();
});

test("admin sends the invoice, marks it paid, then cancels it", async ({ page }) => {
  expect(placed, "the order step must pass first").toBe(true);
  expect(env.adminEmail && env.adminPassword, "set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.e2e").toBeTruthy();

  await logIn(page, `${ADMIN_URL}/login`, env.adminEmail, env.adminPassword, /^Sign in$/);
  await expect(page.getByRole("heading", { name: "Dashboard" }), "admin login failed: check the admin email and password").toBeVisible();

  // The newest order from the launch customer is the one just placed.
  await page.goto(`${ADMIN_URL}/orders?q=${encodeURIComponent("Launch Test")}`);
  const link = page.getByRole("link", { name: /^PY\d+$/ }).first();
  orderNumber = (await link.textContent())!.trim();
  console.log(`Placed ${orderNumber}`);
  await link.click();
  await expect(page.getByRole("heading", { name: `Order ${orderNumber}` })).toBeVisible();
  await expect(page.getByText("Amount to pay")).toBeVisible();

  // The unpaid invoice PDF is generated.
  const pdf = await page.request.get(`${page.url()}/invoice`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  // Paid → the invoice email is sent through Zoho; the page reports success or the exact error.
  await page.locator('select[name="status"]').selectOption("paid");
  await page.getByRole("button", { name: "Save status" }).click();
  const sent = page.getByText(/Invoice emailed to/);
  const failed = page.getByText(/invoice email couldn.t be sent/i);
  await expect(sent.or(failed)).toBeVisible({ timeout: 30_000 });
  if (await failed.isVisible()) throw new Error(`Email is NOT working on the live site: ${await failed.textContent()}`);

  // Clean up: cancel so the stock goes back on sale.
  await page.locator('select[name="status"]').selectOption("cancelled");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByText("This order is cancelled. Its stock has been returned.")).toBeVisible();
  console.log(`${orderNumber}: invoice emailed, then cancelled. Check the inboxes and Telegram.`);
});
