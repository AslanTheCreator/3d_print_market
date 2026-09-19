import { expect, type Page, type Route, test } from "@playwright/test";

test.setTimeout(90_000);

const reply = async (route: Route, body: unknown, status = 200) => {
  const isPreflight = route.request().method() === "OPTIONS";
  await route.fulfill({
    status: isPreflight ? 204 : status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    },
    contentType: "application/json",
    body: isPreflight ? undefined : JSON.stringify(body),
  });
};

const cartItem = (id: number, sellerId: number, availability: "PREORDER" | "PURCHASABLE" = "PURCHASABLE") => ({
  product: {
    id, name: `Коллекционная фигурка ${id} с длинным названием и дополнительными аксессуарами`,
    count: 20, price: id === 1 ? 12990 : 4500, prepaymentAmount: id === 1 ? 2990 : 0,
    currency: "RUB", categories: [{ id: 1, name: "Коллекционные фигурки", childs: [] }],
    imageId: 0, sellerId, sellerLogin: `seller-${sellerId}`, sellerRating: 5, totalReviews: 1,
    expirationDate: "2030-01-01T00:00:00.000Z", createdAt: "2030-01-01T00:00:00.000Z",
    status: "ACTIVE", availability, externalUrl: "",
  },
  count: id === 1 ? 2 : 3,
  availableCount: id === 2 ? 1 : 10,
  enoughStock: id !== 2,
});

const setup = async (page: Page, baseURL: string | undefined) => {
  if (!baseURL) throw new Error("Playwright baseURL is required");
  const state = {
    cart: [cartItem(1, 10, "PREORDER"), cartItem(2, 10), cartItem(3, 20)],
    deliveryStatus: 200,
    writes: [] as Array<{ productId: number; count: number }>,
    transfers: {
      10: [
        { id: 101, sending: "RUSSIAN_POST", price: 300, currency: "RUB", participantId: 10, status: "ACTIVE" },
        { id: 102, sending: "TRANSPORT_COMPANY", price: 500, currency: "RUB", participantId: 10, status: "ACTIVE" },
      ],
      20: [
        { id: 201, sending: "PRODUCT_PICKUP", price: 0, currency: "RUB", participantId: 20, status: "ACTIVE" },
      ],
    } as Record<number, Array<{ id: number; sending: string; price: number; currency: string; participantId: number; status: string }>>,
  };
  await page.context().addCookies([{ name: "access_token", value: "mobile-cart-test-token", url: baseURL }]);
  await page.route("**/api/config", (route) => reply(route, { apiUrl: "http://127.0.0.1:9" }));
  await page.route("https://mc.yandex.ru/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.route("http://127.0.0.1:9/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") return reply(route, null);
    if (url.pathname === "/auth/profile") return reply(route, {
      id: 999, login: "buyer", fullName: "Покупатель", role: "USER",
      email: "buyer@example.com", imageId: null, image: [], exp: 0, type: "access",
    });
    if (url.pathname === "/basket/find") return reply(route, state.cart);
    if (url.pathname === "/basket" && route.request().method() === "PUT") {
      const productId = Number(url.searchParams.get("productId"));
      const count = Number(url.searchParams.get("count"));
      state.writes.push({ productId, count });
      const item = state.cart.find((item) => item.product.id === productId)!;
      item.count = count;
      item.enoughStock = count <= item.availableCount;
      return reply(route, null);
    }
    if (url.pathname === "/address") return reply(route, [{
      id: 50, country: "Россия", city: "Москва", street: "Тестовая", houseNumber: "1",
      apartmentNumber: "", index: 101000, status: "ACTIVE", fullAddress: "Россия, Москва, Тестовая, 1",
    }]);
    if (url.pathname === "/dictionary") return reply(route, [
      { type: "SHOPPING_METHODS", value: "RUSSIAN_POST", description: "Почта России" },
      { type: "SHOPPING_METHODS", value: "TRANSPORT_COMPANY", description: "Транспортная компания" },
      { type: "SHOPPING_METHODS", value: "PRODUCT_PICKUP", description: "Самовывоз" },
    ]);
    if (url.pathname === "/order") {
      const sellerId = state.cart.find((item) => item.product.id === Number(url.searchParams.get("productId")))!.product.sellerId;
      return reply(route, state.deliveryStatus === 200
        ? { addresses: [], sellerTransfers: state.transfers[sellerId] }
        : { code: "DELIVERY_UNAVAILABLE", message: "Не удалось загрузить способы доставки" }, state.deliveryStatus);
    }
    return reply(route, []);
  });
  return state;
};

const dialog = (page: Page) => page.getByRole("dialog", { name: "Способ доставки", exact: true });
const apply = (page: Page) => dialog(page).getByRole("button", { name: "Применить", exact: true });

const expectNoOverflow = async (page: Page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const overflowing = await page.locator('[data-testid^="checkout-cart-item-"]').evaluateAll((cards) =>
    cards.filter((card) => card.scrollWidth > card.clientWidth + 1).map((card) => card.getAttribute("data-testid")),
  );
  expect(overflowing).toEqual([]);
};

test("cart layout fits narrow screens, large amounts and touch targets", async ({ page, baseURL }, testInfo) => {
  const state = await setup(page, baseURL);
  state.cart[0].product.sellerLogin = "ОченьДлинноеИмяПродавцаБезПробелов";
  state.cart[0].product.name = "ОченьДлинноеНазваниеКоллекционнойФигуркиБезПробелов";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/checkout");
  const card = page.getByTestId("checkout-cart-item-1");
  await expect(card).toBeVisible();
  for (const width of [320, 375, 393, 599, 600, 768, 899, 900, 1376]) {
    await page.setViewportSize({ width, height: 800 });
    await expectNoOverflow(page);
    for (const control of await page.locator('[data-testid^="checkout-cart-item-"]').getByRole("button").all()) {
      const box = await control.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(page.getByTestId("checkout-preorder-prepayment-1")).toContainText("5 980");
  await expect(page.getByTestId("checkout-preorder-remainder-1")).toContainText("20 000");
  await page.getByTestId("checkout-seller-10").screenshot({ path: testInfo.outputPath("cart-375.png") });
  await page.setViewportSize({ width: 320, height: 900 });
  await card.screenshot({ path: testInfo.outputPath("cart-320.png") });
  expect(errors).toEqual([]);
});

test("delivery drafts apply per seller, cancel safely and survive selection and resize", async ({ page, baseURL }, testInfo) => {
  const state = await setup(page, baseURL);
  state.transfers[20].push({ id: 202, sending: "TRANSPORT_COMPANY", price: 700, currency: "RUB", participantId: 20, status: "ACTIVE" });
  await page.goto("/checkout");
  const first = page.getByTestId("checkout-delivery-trigger-10");
  const second = page.getByTestId("checkout-delivery-trigger-20");
  await first.click();
  await expect(dialog(page)).toContainText("От продавца seller-10");
  await expect(dialog(page).getByRole("radio")).toHaveCount(2);
  await expect(apply(page)).toBeDisabled();
  await dialog(page).getByRole("radio", { name: /Почта России/ }).check();
  await apply(page).click();
  await expect(first).toContainText("300 ₽");
  await expect(page.getByTestId("checkout-summary-delivery-total")).toHaveText("Не рассчитана");
  await expect(second).toContainText("Выберите способ");
  await second.click();
  await expect(dialog(page)).toContainText("От продавца seller-20");
  await expect(dialog(page).getByRole("radio", { name: /Почта России/ })).toHaveCount(0);
  await dialog(page).getByRole("radio", { name: /Транспортная компания/ }).check();
  await apply(page).click();
  await expect(page.getByTestId("checkout-summary-delivery-10")).toContainText("300 ₽");
  await expect(page.getByTestId("checkout-summary-delivery-20")).toContainText("700 ₽");
  await expect(page.getByTestId("checkout-summary-delivery-total")).toHaveText("1 000 ₽");
  await expect(page.getByTestId("checkout-summary-order-total")).toContainText("53 980");

  await first.click();
  await dialog(page).getByRole("radio", { name: /Транспортная компания/ }).check();
  for (const width of [320, 899, 900, 393]) {
    await page.setViewportSize({ width, height: 650 });
    await expect(dialog(page).getByRole("radio", { name: /Транспортная компания/ })).toBeChecked();
    expect(await dialog(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 500 });
  await dialog(page).screenshot({ path: testInfo.outputPath("delivery-320.png") });
  await page.keyboard.press("Escape");
  await expect(first).toBeFocused();
  await expect(first).toContainText("Почта России");
  await expect(second).toContainText("700 ₽");
  await first.click();
  await expect(dialog(page).getByRole("radio", { name: /Почта России/ })).toBeChecked();
  await dialog(page).getByRole("radio", { name: /Транспортная компания/ }).check();
  await dialog(page).getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(first).toContainText("300 ₽");

  const firstSeller = page.getByTestId("checkout-seller-10");
  await expect(dialog(page)).toHaveCount(0);
  await expect(firstSeller.getByRole("checkbox")).toHaveCount(2);
  for (const checkbox of await firstSeller.getByRole("checkbox").all()) await checkbox.uncheck();
  await expect(page.getByTestId("checkout-summary-delivery-10")).toHaveCount(0);
  await firstSeller.getByRole("checkbox").first().check();
  await expect(first).toContainText("Почта России");
  await expect(page.getByTestId("checkout-summary-delivery-10")).toContainText("300 ₽");
});

test("stock correction syncs through the existing cart API and sold out items can be excluded", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  state.cart[2].availableCount = 0;
  state.cart[2].enoughStock = false;
  await page.goto("/checkout");
  const shortage = page.getByTestId("checkout-cart-item-2");
  await shortage.getByRole("button", { name: "Оставить 1 шт.", exact: true }).click();
  await expect.poll(() => state.writes).toEqual([{ productId: 2, count: 1 }]);
  await expect(shortage.getByTestId("checkout-stock-error-2")).toHaveCount(0);
  await expect(shortage.getByRole("button", { name: /^Увеличить/ })).toBeDisabled();
  const soldOut = page.getByTestId("checkout-cart-item-3");
  await soldOut.getByRole("button", { name: "Исключить из заказа", exact: true }).click();
  await expect(soldOut.getByRole("checkbox")).not.toBeChecked();
  expect(state.writes).toHaveLength(1);
});

test("delivery distinguishes loading, retry and missing methods from free pickup", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/order?productId=1", async (route) => {
    if (route.request().method() === "OPTIONS") return reply(route, null);
    await gate;
    return route.fallback();
  });
  await page.goto("/checkout");
  const seller = page.getByTestId("checkout-seller-10");
  try {
    await expect(seller.getByLabel("Загрузка доставки")).toBeVisible();
    await expect(page.getByTestId("checkout-delivery-summary-20")).toContainText("Бесплатно");
    state.deliveryStatus = 500;
  } finally {
    release();
  }
  await expect(seller.getByRole("alert").filter({ hasText: "Не удалось загрузить способы доставки" })).toBeVisible();
  state.deliveryStatus = 200;
  state.transfers[10] = [];
  await seller.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(seller.getByRole("alert").filter({ hasText: "У продавца нет доступных способов доставки" })).toBeVisible();
  await expect(seller.getByText("Бесплатно", { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 800 });
  await expectNoOverflow(page);
});
