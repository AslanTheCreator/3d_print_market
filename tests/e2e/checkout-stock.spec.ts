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
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
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
      value: "checkout-stock-test-access-token",
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

const fulfillError = async (route: Route) => {
  await route.fulfill({
    status: 500,
    headers: corsHeaders,
    contentType: "application/json",
    body: JSON.stringify({
      code: "CART_UPDATE_FAILED",
      message: "Не удалось обновить корзину",
      status: 500,
    }),
  });
};

const createCartItem = ({
  id,
  name,
  count,
  availableCount,
  enoughStock,
  availability = "PURCHASABLE",
  externalUrl = "",
  sellerId = 10,
  sellerLogin = "stock-seller",
}: {
  id: number;
  name: string;
  count: number;
  availableCount: number | null;
  enoughStock: boolean;
  availability?: "PURCHASABLE" | "PREORDER" | "EXTERNAL_ONLY";
  externalUrl?: string;
  sellerId?: number;
  sellerLogin?: string;
}) => ({
  product: {
    id,
    name,
    count: 20,
    price: 1000 * id,
    prepaymentAmount: 0,
    currency: "RUB",
    categories: [{ id: 1, name: "Фигурки", childs: [] }],
    imageId: 0,
    sellerId,
    expirationDate: "2030-01-01T00:00:00.000Z",
    status: "ACTIVE",
    availability,
    externalUrl,
    sellerLogin,
    sellerRating: 5,
    totalReviews: 1,
    createdAt: "2030-01-01T00:00:00.000Z",
  },
  count,
  availableCount,
  enoughStock,
});

type CartFixture = ReturnType<typeof createCartItem>;

interface CheckoutApiController {
  cartItems: CartFixture[];
  basketMode: "success" | "failure";
  putMode: "success" | "failure" | "deferred-success";
  putGate: Promise<void> | null;
  basketFindRequests: number;
  putRequests: Array<{ productId: number; count: number }>;
  orderDataProductIds: number[];
  orderCreateMode: "success" | "product-not-purchasable";
  orderCreateRequests: Array<
    Array<{
      productId: number;
      count: number;
      addressId: number;
      transferId: number;
      comment: string;
    }>
  >;
}

const setupCheckoutApi = async (
  page: Page,
  cartItems: CartFixture[],
): Promise<CheckoutApiController> => {
  const controller: CheckoutApiController = {
    cartItems,
    basketMode: "success",
    putMode: "success",
    putGate: null,
    basketFindRequests: 0,
    putRequests: [],
    orderDataProductIds: [],
    orderCreateMode: "success",
    orderCreateRequests: [],
  };

  await page.route("**/basket/find", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillJson(route, null);
      return;
    }

    controller.basketFindRequests += 1;

    if (controller.basketMode === "failure") {
      await fulfillError(route);
      return;
    }

    await fulfillJson(route, controller.cartItems);
  });

  await page.route("**/basket?productId=*", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillJson(route, null);
      return;
    }

    const url = new URL(route.request().url());
    const productId = Number(url.searchParams.get("productId"));
    const count = Number(url.searchParams.get("count"));
    controller.putRequests.push({ productId, count });

    if (controller.putMode === "failure") {
      await fulfillError(route);
      return;
    }

    if (controller.putMode === "deferred-success") {
      await controller.putGate;
    }

    const item = controller.cartItems.find(
      (cartItem) => cartItem.product.id === productId,
    );

    if (item) {
      item.count = count;
      item.enoughStock =
        item.availableCount === null || count <= item.availableCount;
    }

    await route.fulfill({ status: 200, headers: corsHeaders, body: "" });
  });

  await page.route("**/auth/profile", (route) =>
    fulfillJson(route, {
      id: 999,
      fullName: "Тестовый покупатель",
      login: "stock-buyer",
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
        value: "PRODUCT_PICKUP",
        description: "Самовывоз",
      },
    ]),
  );
  await page.route("**/order?productId=*", async (route) => {
    const url = new URL(route.request().url());
    const productId = Number(url.searchParams.get("productId"));
    controller.orderDataProductIds.push(productId);

    await fulfillJson(route, {
      addresses: [],
      sellerTransfers: [
        {
          id: 100 + productId,
          sending: "PRODUCT_PICKUP",
          price: 0,
          currency: "RUB",
          participantId:
            controller.cartItems.find(
              (item) => item.product.id === productId,
            )?.product.sellerId ?? 10,
          status: "ACTIVE",
        },
      ],
    });
  });
  await page.route("**/order/BOOKED", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillJson(route, null);
      return;
    }

    const payload = route.request().postDataJSON() as CheckoutApiController["orderCreateRequests"][number];
    controller.orderCreateRequests.push(payload);

    if (controller.orderCreateMode === "product-not-purchasable") {
      const productId = payload[0]?.productId;
      const item = controller.cartItems.find(
        (cartItem) => cartItem.product.id === productId,
      );

      if (item) {
        item.product.availability = "EXTERNAL_ONLY";
        item.product.externalUrl = "https://t.me/stock_seller";
      }

      await route.fulfill({
        status: 400,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({
          code: "PRODUCT_NOT_PURCHASABLE",
          message: "Product is not purchasable",
          status: 400,
        }),
      });
      return;
    }

    await fulfillJson(route, [101]);
  });

  return controller;
};

const openReadyCheckout = async (page: Page) => {
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Оформление заказа" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByText("Тестовая 1", { exact: true }).click();
};

const getIncrementButton = (page: Page, productId: number) =>
  page
    .getByTestId(`checkout-cart-item-${productId}`)
    .getByRole("button", { name: /^Увеличить количество / });

const getQuantityCounter = (page: Page, productId: number) =>
  getIncrementButton(page, productId).locator("..");

test("shows numeric and unlimited stock and ignores an unselected shortage", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  await setupCheckoutApi(page, [
    createCartItem({
      id: 1,
      name: "Ограниченный товар",
      count: 1,
      availableCount: 1,
      enoughStock: true,
    }),
    createCartItem({
      id: 2,
      name: "Неограниченный товар",
      count: 1,
      availableCount: null,
      enoughStock: true,
    }),
    createCartItem({
      id: 3,
      name: "Товар с недостатком",
      count: 2,
      availableCount: 1,
      enoughStock: false,
    }),
  ]);

  await openReadyCheckout(page);

  await expect(page.getByTestId("checkout-stock-availability-1")).toHaveText(
    "Доступно: 1 шт.",
  );
  await expect(getIncrementButton(page, 1)).toBeDisabled();
  await expect(page.getByTestId("checkout-stock-availability-2")).toHaveText(
    "Количество не ограничено",
  );
  await expect(getIncrementButton(page, 2)).toBeEnabled();

  await expect(page.getByTestId("checkout-cart-item-3")).toHaveAttribute(
    "data-stock-status",
    "insufficient",
  );
  await expect(page.getByTestId("checkout-stock-error-3")).toHaveText(
    "Недостаточно товара: в корзине 2 шт., доступно 1 шт.",
  );
  await expect(page.getByTestId("checkout-submit-blocker")).toHaveText(
    "Недостаточно товара для оформления заказа. Измените количество или снимите товар с выбора",
  );

  await page
    .getByRole("checkbox", { name: "Выбрать товар Товар с недостатком" })
    .uncheck();

  await expect(page.getByRole("button", { name: "Оформить заказ" })).toBeEnabled();
  await expect(page.getByTestId("checkout-submit-blocker")).toHaveCount(0);
});

test("keeps checkout pending until PUT and the control refetch succeed", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  const controller = await setupCheckoutApi(page, [
    createCartItem({
      id: 1,
      name: "Синхронизируемый товар",
      count: 1,
      availableCount: null,
      enoughStock: true,
    }),
  ]);
  let releasePut: () => void = () => undefined;
  controller.putGate = new Promise<void>((resolve) => {
    releasePut = resolve;
  });
  controller.putMode = "deferred-success";

  await openReadyCheckout(page);
  const submitButton = page.getByRole("button", { name: "Оформить заказ" });
  await expect(submitButton).toBeEnabled();
  const initialFindRequests = controller.basketFindRequests;

  const incrementButton = getIncrementButton(page, 1);
  await incrementButton.focus();
  await page.keyboard.press("Enter");

  await expect(getQuantityCounter(page, 1).getByText("2", { exact: true })).toBeVisible();
  await expect(page.getByTestId("checkout-submit-blocker")).toHaveText(
    "Синхронизируем количество товаров",
  );
  await expect(submitButton).toBeDisabled();
  await expect.poll(() => controller.putRequests).toEqual([
    { productId: 1, count: 2 },
  ]);

  releasePut();

  await expect
    .poll(() => controller.basketFindRequests)
    .toBeGreaterThan(initialFindRequests);
  await expect(submitButton).toBeEnabled();
  await expect(page.getByTestId("checkout-submit-blocker")).toHaveCount(0);
  await expect(getQuantityCounter(page, 1).getByText("2", { exact: true })).toBeVisible();
});

test("keeps an optimistic catalog quantity when navigating to checkout", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  const controller = await setupCheckoutApi(page, [
    createCartItem({
      id: 1,
      name: "Мгновенно синхронизируемый товар",
      count: 1,
      availableCount: null,
      enoughStock: true,
    }),
  ]);
  let releasePut: () => void = () => undefined;
  controller.putGate = new Promise<void>((resolve) => {
    releasePut = resolve;
  });
  controller.putMode = "deferred-success";

  await page.route("**/products/find", (route) =>
    fulfillJson(route, [controller.cartItems[0].product]),
  );
  await page.route("**/favorites/find", (route) => fulfillJson(route, []));

  await page.goto("/catalog/search?query=sync", {
    waitUntil: "domcontentloaded",
  });

  const productCard = page
    .getByText("Мгновенно синхронизируемый товар", { exact: true })
    .locator("xpath=ancestor::*[contains(@class, 'MuiCard-root')]");
  await expect(productCard).toBeVisible({ timeout: 15_000 });
  await expect(productCard.getByText("1", { exact: true })).toBeVisible();

  const catalogIncrement = productCard.getByRole("button", {
    name: "Увеличить количество Мгновенно синхронизируемый товар",
  });
  await catalogIncrement.focus();
  await page.keyboard.press("Space");
  await expect(productCard.getByText("2", { exact: true })).toBeVisible();

  await page.locator('a[aria-label="Корзина"]').click();
  await expect(
    page.getByRole("heading", { name: "Оформление заказа" }),
  ).toBeVisible({ timeout: 15_000 });

  await expect(
    getQuantityCounter(page, 1).getByText("2", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("checkout-submit-blocker")).toHaveText(
    "Синхронизируем количество товаров",
  );
  await expect.poll(() => controller.putRequests).toEqual([
    { productId: 1, count: 2 },
  ]);

  releasePut();

  await expect.poll(() => controller.cartItems[0].count).toBe(2);
  await expect(
    getQuantityCounter(page, 1).getByText("2", { exact: true }),
  ).toBeVisible();
});

test("rolls back a failed PUT and retries failed stock validation", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  const controller = await setupCheckoutApi(page, [
    createCartItem({
      id: 1,
      name: "Товар с ошибкой синхронизации",
      count: 1,
      availableCount: null,
      enoughStock: true,
    }),
  ]);

  await openReadyCheckout(page);
  await expect(page.getByRole("button", { name: "Оформить заказ" })).toBeEnabled();
  const initialFindRequests = controller.basketFindRequests;
  controller.putMode = "failure";
  controller.basketMode = "failure";

  await getIncrementButton(page, 1).click();

  await expect.poll(() => controller.putRequests).toEqual([
    { productId: 1, count: 2 },
  ]);
  await expect(
    page.getByText(
      "Не удалось сохранить количество. Восстановлено предыдущее значение",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(getQuantityCounter(page, 1).getByText("1", { exact: true })).toBeVisible();
  await expect(page.getByTestId("checkout-submit-blocker")).toHaveText(
    "Не удалось проверить актуальные остатки",
  );
  await expect(page.getByTestId("checkout-stock-validation-retry")).toHaveText(
    "Повторить проверку",
  );

  controller.basketMode = "success";
  await page.getByTestId("checkout-stock-validation-retry").click();

  await expect
    .poll(() => controller.basketFindRequests)
    .toBeGreaterThan(initialFindRequests + 1);
  await expect(page.getByRole("button", { name: "Оформить заказ" })).toBeEnabled();
  await expect(page.getByTestId("checkout-submit-blocker")).toHaveCount(0);
  await expect(page.getByTestId("checkout-stock-validation-retry")).toHaveCount(0);
});

test("keeps an external cart item visible but outside quantity, delivery and order flows", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  const controller = await setupCheckoutApi(page, [
    createCartItem({
      id: 1,
      name: "Обычный товар",
      count: 1,
      availableCount: 5,
      enoughStock: true,
      sellerId: 10,
      sellerLogin: "internal-seller",
    }),
    createCartItem({
      id: 2,
      name: "Внешний товар",
      count: 3,
      availableCount: null,
      enoughStock: true,
      availability: "EXTERNAL_ONLY",
      externalUrl: "https://t.me/external_seller",
      sellerId: 20,
      sellerLogin: "external-seller",
    }),
  ]);

  await openReadyCheckout(page);

  const externalItem = page.getByTestId("checkout-cart-item-2");
  await expect(
    externalItem.getByTestId("checkout-external-notice-2"),
  ).toHaveText("Доступно только через Telegram");
  await expect(
    externalItem.locator('svg[data-testid="AddIcon"]'),
  ).toHaveCount(0);
  await expect(externalItem.getByRole("button", { name: "Купить" })).toBeVisible();
  await expect(page.getByTestId("checkout-submit-blocker")).toHaveText(
    "Среди выбранных товаров есть доступные только через Telegram. Снимите их с выбора или перейдите к продавцу",
  );
  await expect.poll(() => controller.orderDataProductIds).toEqual([1]);
  expect(controller.putRequests).toEqual([]);

  await externalItem.getByRole("button", { name: "Купить" }).click();
  await expect(
    page.getByRole("dialog", { name: "Покупка через Telegram" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Отмена" }).click();

  await page
    .getByRole("checkbox", { name: "Выбрать товар Внешний товар" })
    .uncheck();

  const submitButton = page.getByRole("button", { name: "Оформить заказ" });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect.poll(() => controller.orderCreateRequests.length).toBe(1);
  expect(controller.orderCreateRequests[0]).toEqual([
    {
      productId: 1,
      count: 1,
      addressId: 50,
      transferId: 101,
      comment: "",
    },
  ]);
  expect(
    controller.orderCreateRequests.flat().some((order) => order.productId === 2),
  ).toBe(false);
  expect(controller.putRequests).toEqual([]);
});

test("does not offer retry after PRODUCT_NOT_PURCHASABLE and refreshes the cart item", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  const controller = await setupCheckoutApi(page, [
    createCartItem({
      id: 1,
      name: "Ставший внешним товар",
      count: 1,
      availableCount: 5,
      enoughStock: true,
    }),
  ]);
  controller.orderCreateMode = "product-not-purchasable";

  await openReadyCheckout(page);
  await page.getByRole("button", { name: "Оформить заказ" }).click();

  const resultDialog = page.getByTestId("checkout-result-dialog");
  await expect(resultDialog).toBeVisible();
  await expect(resultDialog).toContainText(
    "Этот товар можно приобрести только через Telegram",
  );
  await expect(
    resultDialog.getByRole("button", {
      name: "Повторить для неудачных",
    }),
  ).toHaveCount(0);

  await resultDialog
    .getByRole("button", { name: "Вернуться к оформлению" })
    .click();
  await expect(page.getByTestId("checkout-external-notice-1")).toHaveText(
    "Доступно только через Telegram",
  );
  await expect(
    page
      .getByTestId("checkout-cart-item-1")
      .locator('svg[data-testid="AddIcon"]'),
  ).toHaveCount(0);
  expect(controller.orderCreateRequests).toHaveLength(1);
});
