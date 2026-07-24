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
      {
        id: 103,
        name: "Внешний товар",
        count: 1,
        price: 1700,
        prepaymentAmount: 0,
        currency: "RUB",
        categories: [],
        imageId: 0,
        sellerId: 1,
        expirationDate: "2020-01-01T00:00:00.000Z",
        status: "ACTIVE",
        availability: "EXTERNAL_ONLY",
        externalUrl: "https://example.com/external-product",
        sellerLogin: "seller",
        sellerRating: 5,
        totalReviews: 1,
        createdAt: "2026-07-18T10:00:00.000Z",
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

test("внешний товар недоступен для управления", async ({
  page,
  context,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  await mockUserProductsApi(page);

  await page.goto("/dashboard/products");

  await expect(
    page.getByText("Внешний источник", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Действия с товаром Внешний товар",
    }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Продлить" })).toHaveCount(0);

  const internalProductActions = page.getByRole("button", {
    name: "Действия с товаром Товар с остатком",
  });
  await expect(internalProductActions).toBeVisible();
  await internalProductActions.click();
  await expect(
    page.getByRole("menuitem", { name: "Редактировать" }),
  ).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Удалить" })).toBeVisible();
});

test("прямой edit route внешнего товара показывает read-only состояние", async ({
  page,
  context,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  let updateRequests = 0;

  await page.route("**/basket/find", (route) => fulfillJson(route, []));
  await page.route("**/favorites/find", (route) => fulfillJson(route, []));
  await page.route("**/categories", (route) => fulfillJson(route, []));
  await page.route("**/product/103", (route) => {
    if (route.request().method() === "PUT") {
      updateRequests += 1;
      void fulfillJson(route, null);
      return;
    }

    void fulfillJson(route, {
      id: 103,
      name: "Внешний товар",
      description: "Управляется внешним источником",
      price: 1700,
      prepaymentAmount: 0,
      count: 1,
      currency: "RUB",
      originality: "ORIGINAL",
      participantId: 1,
      status: "ACTIVE",
      categories: [],
      availability: "EXTERNAL_ONLY",
      externalUrl: "https://example.com/external-product",
      imageIds: [],
      reviews: [],
      sellerLogin: "seller",
      sellerRating: 5,
      totalReviews: 1,
    });
  });

  await page.goto("/dashboard/products/103/edit");

  await expect(
    page.getByRole("heading", { name: "Редактирование недоступно" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Этот товар управляется внешним источником. Изменить или удалить его через Figurzilla нельзя.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Название товара")).toHaveCount(0);
  expect(updateRequests).toBe(0);
});

test("EXTERNAL_ONLY из старого черновика не попадает в форму создания", async ({
  page,
  context,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "create-product-form-draft",
      JSON.stringify({
        imageIds: [],
        values: {
          availability: "EXTERNAL_ONLY",
          isPreorder: true,
          categoryIds: [],
          name: "Старый внешний черновик",
          price: "1000",
          currency: "RUB",
          description: "",
          prepaymentAmount: "",
          count: "1",
          originality: "ORIGINAL",
          externalUrl: "https://example.com/external-product",
        },
      }),
    );
  });

  await page.route("**/basket/find", (route) => fulfillJson(route, []));
  await page.route("**/favorites/find", (route) => fulfillJson(route, []));
  await page.route("**/categories", (route) =>
    fulfillJson(route, [{ id: 1, name: "Фигурки", childs: [] }]),
  );
  await page.route("**/participant", (route) =>
    fulfillJson(route, {
      id: 1,
      login: "seller",
      mail: "seller@example.com",
      fullName: "Продавец",
      phoneNumber: "",
      status: "ACTIVE",
      sellerStatus: "DEFAULT",
      averageRating: 5,
      totalReviews: 1,
      imageId: null,
      addresses: [],
      accounts: [],
      transfers: [],
      socialNetworks: [],
    }),
  );

  await page.goto("/dashboard/products/new");

  await expect(
    page.getByRole("button", { name: "В наличии" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Предзаказ" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Внешняя покупка" }),
  ).toHaveCount(0);
});
