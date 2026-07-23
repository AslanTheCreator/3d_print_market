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
      value: "checkout-test-access-token",
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

const createProduct = (
  id: number,
  sellerId: number,
  sellerLogin: string,
  price: number,
) => ({
  id,
  name: `Товар ${id}`,
  count: 5,
  price,
  prepaymentAmount: 0,
  currency: "RUB",
  categories: [{ id: 1, name: "Фигурки", childs: [] }],
  imageId: 0,
  sellerId,
  expirationDate: "2030-01-01T00:00:00.000Z",
  status: "ACTIVE",
  availability: "PURCHASABLE",
  sellerLogin,
  sellerRating: 5,
  totalReviews: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
});

test("selects delivery independently for each seller", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);

  const sellerOneTransfers = [
    {
      id: 101,
      sending: "RUSSIAN_POST",
      price: 300,
      currency: "RUB",
      participantId: 10,
      status: "ACTIVE",
    },
    {
      id: 102,
      sending: "TRANSPORT_COMPANY",
      price: 500,
      currency: "RUB",
      participantId: 10,
      status: "ACTIVE",
    },
  ];
  const sellerTwoTransfers = [
    {
      id: 201,
      sending: "PRODUCT_PICKUP",
      price: 0,
      currency: "RUB",
      participantId: 20,
      status: "ACTIVE",
    },
  ];
  const cartItems = [
    {
      product: createProduct(1, 10, "seller-one", 1000),
      count: 1,
      availableCount: 5,
      enoughStock: true,
    },
    {
      product: createProduct(2, 10, "seller-one", 2000),
      count: 1,
      availableCount: 5,
      enoughStock: true,
    },
    {
      product: createProduct(3, 20, "seller-two", 3000),
      count: 1,
      availableCount: 5,
      enoughStock: true,
    },
    {
      product: createProduct(4, 30, "seller-without-delivery", 4000),
      count: 1,
      availableCount: 5,
      enoughStock: true,
    },
  ];
  const createdOrders: unknown[] = [];
  let orderResponseMode: "partial" | "failure" | "success" = "partial";

  await page.route("**/basket/find", (route) => fulfillJson(route, cartItems));
  await page.route("**/auth/profile", (route) =>
    fulfillJson(route, {
      id: 30,
      fullName: "Тестовый пользователь",
      login: "buyer",
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
        value: "RUSSIAN_POST",
        description: "Почта России",
      },
      {
        type: "SHOPPING_METHODS",
        value: "TRANSPORT_COMPANY",
        description: "Транспортная компания",
      },
      {
        type: "SHOPPING_METHODS",
        value: "PRODUCT_PICKUP",
        description: "Самовывоз",
      },
    ]),
  );
  await page.route("**/order?productId=*", (route) => {
    const productId = Number(new URL(route.request().url()).searchParams.get("productId"));
    const sellerTransfers =
      productId === 1 || productId === 2
        ? sellerOneTransfers
        : productId === 3
          ? sellerTwoTransfers
          : [];

    return fulfillJson(route, {
      addresses: [],
      sellerTransfers,
    });
  });
  await page.route("**/order/BOOKED", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    const requestBody = route.request().postDataJSON() as Array<{
      productId: number;
    }>;
    createdOrders.push(requestBody);

    if (orderResponseMode === "partial" && requestBody[0]?.productId === 1) {
      await fulfillJson(route, [createdOrders.length]);
      return;
    }

    if (orderResponseMode === "success") {
      await fulfillJson(route, [createdOrders.length]);
      return;
    }

    await route.fulfill({
      status: 500,
      headers: corsHeaders,
      contentType: "application/json",
      body: JSON.stringify({
        code: "ORDER_CREATE_FAILED",
        message: "Не удалось создать заказ",
        status: 500,
      }),
    });
  });

  await page.goto("/checkout", { waitUntil: "domcontentloaded" });

  const sellerOne = page.getByTestId("checkout-seller-10");
  const sellerTwo = page.getByTestId("checkout-seller-20");
  const sellerWithoutDelivery = page.getByTestId("checkout-seller-30");
  const submitButton = page.getByRole("button", { name: "Оформить заказ" });
  const submitBlocker = page.getByTestId("checkout-submit-blocker");

  await expect(sellerOne).toBeVisible({ timeout: 15_000 });
  await expect(sellerTwo).toBeVisible();
  await expect(sellerWithoutDelivery).toContainText(
    "У продавца нет доступных способов доставки",
  );
  await expect(sellerOne.getByRole("radio")).toHaveCount(2);
  await expect(sellerOne.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(sellerTwo.getByRole("radio")).toBeChecked();
  await expect(submitButton).toBeDisabled();
  await expect(submitBlocker).toHaveText("Выберите адрес доставки");

  await page.getByText("Тестовая 1", { exact: true }).click();
  await sellerOne.getByTestId("checkout-delivery-10-101").click();

  await expect(submitButton).toBeDisabled();
  await expect(submitBlocker).toHaveText(
    "Нельзя оформить заказ на собственный товар. Снимите его выбор или удалите из корзины",
  );
  await page
    .getByRole("checkbox", { name: "Выбрать товар Товар 4" })
    .uncheck();
  await expect(submitButton).toBeEnabled();
  await expect(submitBlocker).toHaveCount(0);
  await expect(page.getByTestId("checkout-summary-delivery-10")).toContainText(
    "300 ₽",
  );
  await expect(page.getByTestId("checkout-summary-delivery-20")).toContainText(
    "Бесплатно",
  );

  await page
    .getByRole("checkbox", { name: "Выбрать товар Товар 1" })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Выбрать товар Товар 2" })
    .uncheck();
  await expect(sellerOne).toContainText(
    "Выберите хотя бы один товар продавца",
  );
  await expect(page.getByTestId("checkout-summary-delivery-10")).toHaveCount(0);
  await expect(submitButton).toBeEnabled();

  await page
    .getByRole("checkbox", { name: "Выбрать товар Товар 1" })
    .check();
  await page
    .getByRole("checkbox", { name: "Выбрать товар Товар 2" })
    .check();
  await expect(sellerOne.locator('input[type="radio"]:checked')).toHaveValue(
    "101",
  );
  await expect(submitButton).toBeEnabled();

  await submitButton.click();
  await expect.poll(() => createdOrders.length).toBe(3);
  await expect(page.getByTestId("checkout-result-title")).toHaveText(
    "Часть заказов оформлена",
  );

  const returnToCheckoutButton = page.getByRole("button", {
    name: "Вернуться к оформлению",
  });
  await returnToCheckoutButton.click();

  await expect(page.getByTestId("checkout-result-dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Оформление заказа" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Выбрать товар Товар 1" }),
  ).toHaveCount(0);
  await expect(submitButton).toBeEnabled();

  orderResponseMode = "failure";
  await submitButton.click();
  await expect.poll(() => createdOrders.length).toBe(5);
  await expect(page.getByTestId("checkout-result-title")).toHaveText(
    "Не удалось оформить заказы",
  );
  expect(
    createdOrders
      .slice(3, 5)
      .map((requestBody) => {
        const [order] = requestBody as Array<{
          productId: number;
          count: number;
        }>;
        return [order.productId, order.count] as const;
      })
      .sort(([left], [right]) => left - right),
  ).toEqual([
    [2, 1],
    [3, 1],
  ]);

  const retryButton = page.getByRole("button", {
    name: "Повторить для неудачных",
  });
  await retryButton.click();
  await expect.poll(() => createdOrders.length).toBe(7);
  await expect(page.getByText("Не удалось оформить (2)")).toBeVisible();
  expect(
    createdOrders
      .slice(5, 7)
      .map((requestBody) => {
        const [order] = requestBody as Array<{
          productId: number;
          count: number;
        }>;
        return [order.productId, order.count] as const;
      })
      .sort(([left], [right]) => left - right),
  ).toEqual([
    [2, 1],
    [3, 1],
  ]);

  orderResponseMode = "success";
  await retryButton.click();
  await expect.poll(() => createdOrders.length).toBe(9);
  await expect(page.getByTestId("checkout-result-title")).toHaveText(
    "Заказы успешно оформлены!",
  );
  await expect(
    page.getByText(
      'Все 2 заказа успешно оформлены. Вы можете отслеживать их статус в разделе "Мои покупки".',
    ),
  ).toBeVisible();
  expect(
    createdOrders
      .slice(7, 9)
      .map((requestBody) => {
        const [order] = requestBody as Array<{
          productId: number;
          count: number;
        }>;
        return [order.productId, order.count] as const;
      })
      .sort(([left], [right]) => left - right),
  ).toEqual([
    [2, 1],
    [3, 1],
  ]);

  const transferByProduct = new Map(
    createdOrders.slice(0, 3).map((requestBody) => {
      const [order] = requestBody as Array<{
        productId: number;
        transferId: number;
      }>;
      return [order.productId, order.transferId];
    }),
  );

  expect(transferByProduct).toEqual(
    new Map([
      [1, 101],
      [2, 101],
      [3, 201],
    ]),
  );
});
