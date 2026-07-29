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
      value: "checkout-preorder-test-access-token",
      url: baseURL,
    },
  ]);
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

const createProduct = ({
  id,
  name,
  availability,
  price,
  prepaymentAmount,
}: {
  id: number;
  name: string;
  availability: "PURCHASABLE" | "PREORDER";
  price: number;
  prepaymentAmount: number;
}) => ({
  id,
  name,
  count: 10,
  price,
  prepaymentAmount,
  currency: "RUB",
  categories: [{ id: 1, name: "Фигурки", childs: [] }],
  imageId: 0,
  sellerId: 10,
  expirationDate: "2030-01-01T00:00:00.000Z",
  status: "ACTIVE",
  availability,
  externalUrl: "",
  sellerLogin: "preorder-seller",
  sellerRating: 5,
  totalReviews: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
});

type ProductFixture = ReturnType<typeof createProduct>;

const createCartItem = (product: ProductFixture, count: number) => ({
  product,
  count,
  availableCount: 10,
  enoughStock: true,
});

const setupCheckoutApi = async (
  page: Page,
  cartItems: ReturnType<typeof createCartItem>[],
) => {
  const orderRequests: unknown[] = [];

  await page.route("**/basket/find", (route) =>
    fulfillJson(route, cartItems),
  );
  await page.route("**/auth/profile", (route) =>
    fulfillJson(route, {
      id: 999,
      fullName: "Тестовый покупатель",
      login: "preorder-buyer",
      role: "USER",
      email: "buyer@example.com",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    }),
  );
  await page.route("**/address", (route) =>
    fulfillJson(route, [
      {
        id: 50,
        country: "Россия",
        city: "Москва",
        street: "Тестовая",
        houseNumber: "1",
        apartmentNumber: "",
        index: 101000,
        status: "ACTIVE",
        fullAddress: "Россия, Москва, Тестовая, 1",
      },
    ]),
  );
  await page.route("**/dictionary?type=*", (route) =>
    fulfillJson(route, [
      {
        type: "SHOPPING_METHODS",
        value: "TRANSPORT_COMPANY",
        description: "Транспортная компания",
      },
    ]),
  );
  await page.route("**/order?productId=*", (route) =>
    fulfillJson(route, {
      addresses: [],
      sellerTransfers: [
        {
          id: 101,
          sending: "TRANSPORT_COMPANY",
          price: 500,
          currency: "RUB",
          participantId: 10,
          status: "ACTIVE",
        },
      ],
    }),
  );
  await page.route("**/order/BOOKED", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillJson(route, null);
      return;
    }

    orderRequests.push(route.request().postDataJSON());
    await fulfillJson(route, [100 + orderRequests.length]);
  });

  return orderRequests;
};

const openCheckout = async (page: Page) => {
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Оформление заказа" }),
  ).toBeVisible({ timeout: 15_000 });
};

test("shows preorder breakdown while checkout total stays based on full prices", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  await setupCheckoutApi(page, [
    createCartItem(
      createProduct({
        id: 1,
        name: "Предзаказная фигурка",
        availability: "PREORDER",
        price: 1_000,
        prepaymentAmount: 250,
      }),
      2,
    ),
    createCartItem(
      createProduct({
        id: 2,
        name: "Обычная фигурка",
        availability: "PURCHASABLE",
        price: 2_000,
        prepaymentAmount: 0,
      }),
      1,
    ),
  ]);

  await openCheckout(page);

  const preorderCard = page.getByTestId("checkout-cart-item-1");
  await expect(
    preorderCard.getByTestId("checkout-preorder-badge-1"),
  ).toHaveText("Предзаказ");
  await expect(
    preorderCard.getByTestId("checkout-preorder-total-1"),
  ).toContainText("2 000");
  await expect(
    preorderCard.getByTestId("checkout-preorder-prepayment-1"),
  ).toContainText("500");
  await expect(
    preorderCard.getByTestId("checkout-preorder-remainder-1"),
  ).toContainText("1 500");

  const regularCard = page.getByTestId("checkout-cart-item-2");
  await expect(
    regularCard.locator('[data-testid^="checkout-preorder-"]'),
  ).toHaveCount(0);

  await expect(
    page.getByTestId("checkout-summary-products-total"),
  ).toContainText("4 000");
  await expect(
    page.getByTestId("checkout-summary-order-total"),
  ).toContainText("4 500");
});

test("explains preorder payment stages in a successful result", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  const orderRequests = await setupCheckoutApi(page, [
    createCartItem(
      createProduct({
        id: 1,
        name: "Предзаказная фигурка",
        availability: "PREORDER",
        price: 1_000,
        prepaymentAmount: 250,
      }),
      1,
    ),
    createCartItem(
      createProduct({
        id: 2,
        name: "Обычная фигурка",
        availability: "PURCHASABLE",
        price: 2_000,
        prepaymentAmount: 0,
      }),
      1,
    ),
  ]);

  await openCheckout(page);
  await page
    .getByRole("checkbox", { name: "Выбрать товар Обычная фигурка" })
    .uncheck();
  await page.getByText("Тестовая 1", { exact: true }).click();
  await page.getByRole("button", { name: "Оформить заказ" }).click();

  await expect.poll(() => orderRequests.length).toBe(1);
  const resultDialog = page.getByTestId("checkout-result-dialog");
  await expect(resultDialog).toBeVisible();
  await expect(resultDialog).toContainText(
    "Для предзаказа продавец сначала подтвердит заказ",
  );
  await expect(resultDialog).toContainText(
    "внести предоплату и после её подтверждения — оплатить остаток",
  );
});

test("shows accurate preorder guidance after the cart is completed", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  await setupCheckoutApi(page, [
    createCartItem(
      createProduct({
        id: 1,
        name: "Предзаказная фигурка",
        availability: "PREORDER",
        price: 1_000,
        prepaymentAmount: 250,
      }),
      1,
    ),
  ]);

  await openCheckout(page);
  await page.getByText("Тестовая 1", { exact: true }).click();
  await page.getByRole("button", { name: "Оформить заказ" }).click();

  await expect(
    page.getByRole("heading", { name: "Заказы оформлены!" }),
  ).toBeVisible();
  await expect(page.getByText("Что дальше с предзаказом")).toBeVisible();
  await expect(
    page.getByText("Внесите предоплату на следующем этапе"),
  ).toBeVisible();
  await expect(
    page.getByText("После подтверждения предоплаты оплатите остаток"),
  ).toBeVisible();
});
