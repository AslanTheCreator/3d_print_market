import { expect, type Page, type Route, test } from "@playwright/test";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const fulfillJson = async (route: Route, body: unknown) => {
  await route.fulfill({
    status: route.request().method() === "OPTIONS" ? 204 : 200,
    headers: corsHeaders,
    contentType: "application/json",
    body: route.request().method() === "OPTIONS" ? "" : JSON.stringify(body),
  });
};

const product = {
  id: 501, name: "Внешняя фигурка", count: null, price: 2500, prepaymentAmount: 0,
  currency: "RUB", categories: [{ id: 1, name: "Фигурки", childs: [] }],
  imageId: 0, sellerId: 10, expirationDate: "2030-01-01T00:00:00.000Z",
  status: "ACTIVE", availability: "EXTERNAL_PRODUCT", externalUrl: null,
  sellerLogin: "agent-seller", sellerRating: 5, totalReviews: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
};

const mockCatalog = async (page: Page, buyerId = 99, externalUrl: string | null = null) => {
  const writes: Array<{ method: string; productId: number; count: number }> = [];
  let quantity = 0;
  const responseProduct = { ...product, externalUrl };
  await page.route("**/products/find", (route) => fulfillJson(route, [responseProduct]));
  await page.route("**/favorites/find", (route) => fulfillJson(route, [responseProduct]));
  await page.route("**/auth/profile", (route) => fulfillJson(route, {
    id: buyerId, fullName: "Покупатель", login: "buyer", role: "USER",
    email: "buyer@example.com", imageId: null, exp: 0, type: "access",
  }));
  await page.route("**/basket**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, null);
      return;
    }
    if (url.pathname === "/basket/find") {
      await fulfillJson(route, quantity ? [{ product: responseProduct, count: quantity, availableCount: null, enoughStock: true }] : []);
      return;
    }
    quantity = Number(url.searchParams.get("count"));
    writes.push({ method: request.method(), productId: Number(url.searchParams.get("productId")), count: quantity });
    await fulfillJson(route, null);
  });
  return writes;
};

test("guest external purchase opens authorization without an external link", async ({ page }) => {
  const writes = await mockCatalog(page, 99, "https://t.me/legacy-seller");
  await page.goto("/catalog/search?query=external");
  await page.getByRole("button", { name: "Купить", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /Telegram/ })).toHaveCount(0);
  await expect(page.locator('a[href*="t.me/legacy-seller"]')).toHaveCount(0);
  expect(writes).toEqual([]);
});

for (const path of ["/catalog/search?query=external", "/favorites"]) {
  test("external product uses the cart with unlimited stock on " + path, async ({ context, page, baseURL }) => {
    await context.addCookies([{ name: "access_token", value: "external-test-token", url: baseURL! }]);
    const writes = await mockCatalog(page);
    await page.goto(path);
    await page.getByRole("button", { name: "Купить", exact: true }).click();
    await expect.poll(() => writes).toEqual([{ method: "POST", productId: 501, count: 1 }]);
    const increment = page.getByRole("button", { name: /Увеличить/ });
    await expect(increment).toBeEnabled();
    await increment.click();
    await expect.poll(() => writes.at(-1)).toEqual({ method: "PUT", productId: 501, count: 2 });
    await expect(page.getByText("Нет в наличии", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Покупка через Telegram" })).toHaveCount(0);
  });
}

test("own external product remains unavailable for purchase", async ({ context, page, baseURL }) => {
  await context.addCookies([{ name: "access_token", value: "external-test-token", url: baseURL! }]);
  const writes = await mockCatalog(page, 10);
  await page.goto("/catalog/search?query=external");
  await expect(page.getByRole("button", { name: "Ваш товар" })).toBeDisabled();
  expect(writes).toEqual([]);
});

test("external product detail shows unlimited stock and a regular purchase action", async ({ page }) => {
  test.skip(Boolean(process.env.TEST_BASE_URL) && !process.env.PLAYWRIGHT_FIXTURE_API_URL, "Requires the SSR fixture");
  await mockCatalog(page);
  await page.goto("/catalog/902/detail");
  await expect(page.getByTestId("product-details")).toBeVisible();
  await expect(page.getByText("∞ в наличии", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByTestId("product-purchase-action").getByRole("button", { name: /Добавить в корзину/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /Telegram/ })).toHaveCount(0);
});
