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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      value: "own-product-test-access-token",
      url: baseURL,
    },
  ]);
};

const fulfillJson = async (
  route: Route,
  body: unknown,
  status = 200,
) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return;
  }

  await route.fulfill({
    status,
    headers: corsHeaders,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

const createProduct = (id: number, sellerId: number, name: string) => ({
  id,
  name,
  count: 5,
  price: 1000,
  prepaymentAmount: 0,
  currency: "RUB",
  categories: [{ id: 1, name: "Фигурки", childs: [] }],
  imageId: 0,
  sellerId,
  expirationDate: "2030-01-01T00:00:00.000Z",
  status: "ACTIVE",
  availability: "PURCHASABLE",
  sellerLogin: `seller-${sellerId}`,
  sellerRating: 5,
  totalReviews: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
});

const setupCatalog = async (
  context: BrowserContext,
  page: Page,
  baseURL: string | undefined,
  addToCartHandler: (route: Route) => void,
) => {
  await authenticate(context, baseURL);

  await page.route("**/products/find", (requestRoute) =>
    void fulfillJson(requestRoute, [
      createProduct(1, 30, "Собственный товар"),
      createProduct(2, 40, "Чужой товар"),
    ]),
  );
  await page.route("**/auth/profile", (requestRoute) =>
    void fulfillJson(requestRoute, {
      id: 30,
      fullName: "Тестовый пользователь",
      login: "seller-30",
      role: "USER",
      email: "seller@example.com",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    }),
  );
  await page.route("**/basket/find", (requestRoute) =>
    void fulfillJson(requestRoute, []),
  );
  await page.route("**/favorites/find", (requestRoute) =>
    void fulfillJson(requestRoute, []),
  );
  await page.route(/\/basket\?productId=/, addToCartHandler);
};

test("disables purchase for an own product and keeps another product purchasable", async ({
  context,
  page,
  baseURL,
}) => {
  const addedProductIds: number[] = [];

  await setupCatalog(context, page, baseURL, (route) => {
    const productId = Number(
      new URL(route.request().url()).searchParams.get("productId"),
    );
    addedProductIds.push(productId);
    void fulfillJson(route, null);
  });

  await page.goto("/catalog/search?query=товар", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("button", { name: "Ваш товар" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Купить" })).toBeEnabled();
  expect(addedProductIds).toEqual([]);

  await page.getByRole("button", { name: "Купить" }).click();

  await expect.poll(() => addedProductIds).toEqual([2]);
  await expect(page.getByText("Товар успешно добавлен в корзину")).toBeVisible();
});

test("shows the own-product backend error without a status field in body", async ({
  context,
  page,
  baseURL,
}) => {
  let addRequestsCount = 0;

  await setupCatalog(context, page, baseURL, (route) => {
    addRequestsCount += 1;
    void fulfillJson(
      route,
      {
        code: "OWN_PRODUCT_PURCHASE_FORBIDDEN",
        message: "Нельзя покупать собственный товар",
        details: { productId: 2 },
      },
      422,
    );
  });

  await page.goto("/catalog/search?query=товар", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("button", { name: "Ваш товар" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Купить" })).toBeEnabled();
  await page.getByRole("button", { name: "Купить" }).click();

  await expect.poll(() => addRequestsCount).toBe(1);
  await expect(
    page.getByText("Нельзя добавить в корзину собственный товар"),
  ).toBeVisible();
});
