import { expect, type Page } from "@playwright/test";

export { ADMIN_URL, BASE_URL } from "../playwright.config";

/** Fails the test on any uncaught browser error. */
export function failOnPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return () => expect(errors, "uncaught errors in the browser").toEqual([]);
}

/** Records POSTs (server actions) so tests can prove invalid forms never reach the server. */
export function watchPosts(page: Page) {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  return posts;
}

/** Opens the first product that can be added to the cart. */
export async function openInStockProduct(page: Page) {
  await page.goto("/shop");
  const links = await page.locator('a[href^="/product/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  expect(links.length, "the shop lists products").toBeGreaterThan(0);
  for (const href of links.slice(0, 8)) {
    await page.goto(href);
    const add = page.getByRole("button", { name: "Add to Cart" });
    if (await add.isEnabled().catch(() => false)) return add;
  }
  throw new Error("No in-stock product among the first 8");
}
