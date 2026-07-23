import {
  expect,
  type BrowserContext,
  type Page,
  type Route,
  test,
} from "@playwright/test";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const fulfillJson = async (route: Route, body: unknown) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return;
  }

  await route.fulfill({
    status: 200,
    headers: corsHeaders,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

const authenticate = async (
  context: BrowserContext,
  baseURL: string | undefined,
) => {
  if (!baseURL) {
    throw new Error("Playwright baseURL is required for auth cookie setup");
  }

  await context.addCookies([
    {
      name: "access_token",
      value: "user-products-stock-test-token",
      url: baseURL,
    },
  ]);
};

const mockUserProductsApi = async (page: Page) => {
  await page.route("**/basket/find", (route) => fulfillJson(route, []));
  await page.route("**/favorites/find", (route) => fulfillJson(route, []));
  await page.route("**/products/my", (route) =>
    fulfillJson(route, [
      {
        id: 101,
        name: "Товар без остатка",
        count: 0,
        price: 1200,
        prepaymentAmount: 0,
        currency: "RUB",
        categories: [],
        imageId: 0,
        sellerId: 1,
        expirationDate: "2030-01-01T00:00:00.000Z",
        status: "ACTIVE",
        availability: "PURCHASABLE",
        externalUrl: "",
        sellerLogin: "seller",
        sellerRating: 5,
        totalReviews: 1,
        createdAt: "2026-07-20T10:00:00.000Z",
      },
      {
        id: 102,
        name: "Товар с остатком",
        count: 3,
        price: 1500,
        prepaymentAmount: 0,
        currency: "RUB",
        categories: [],
        imageId: 0,
        sellerId: 1,
        expirationDate: "2030-01-01T00:00:00.000Z",
        status: "ACTIVE",
        availability: "PURCHASABLE",
        externalUrl: "",
        sellerLogin: "seller",
        sellerRating: 5,
        totalReviews: 1,
        createdAt: "2026-07-19T10:00:00.000Z",
      },
    ]),
  );
};

test("нулевой остаток явно показан в Моих товарах", async ({
  page,
  context,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  await mockUserProductsApi(page);

  await page.goto("/dashboard/products");

  await expect(page.getByRole("heading", { name: "Мои товары" })).toBeVisible();
  await expect(page.getByText("Товар без остатка", { exact: true })).toBeVisible();
  await expect(page.getByText("Нет в наличии", { exact: true })).toBeVisible();
  await expect(page.getByText("Товар с остатком", { exact: true })).toBeVisible();
  await expect(page.getByText("3 шт", { exact: true })).toBeVisible();
});
