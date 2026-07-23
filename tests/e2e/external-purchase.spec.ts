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
      value: "external-purchase-test-token",
      url: baseURL,
    },
  ]);
};

const createExternalProduct = (externalUrl: string) => ({
  id: 501,
  name: "Товар из Telegram",
  count: 0,
  price: 2500,
  prepaymentAmount: 0,
  currency: "RUB",
  categories: [{ id: 1, name: "Фигурки", childs: [] }],
  imageId: 0,
  sellerId: 10,
  expirationDate: "2030-01-01T00:00:00.000Z",
  status: "ACTIVE",
  availability: "EXTERNAL_ONLY",
  externalUrl,
  sellerLogin: "telegram-seller",
  sellerRating: 5,
  totalReviews: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
});

const mockCatalog = async (page: Page, externalUrl: string) => {
  let basketMutationRequests = 0;

  await page.route("**/products/find", (route) =>
    void fulfillJson(route, [createExternalProduct(externalUrl)]),
  );
  await page.route("**/basket**", (route) => {
    const request = route.request();
    const isCartRead = new URL(request.url()).pathname.endsWith("/basket/find");

    if (!isCartRead && request.method() !== "OPTIONS") {
      basketMutationRequests += 1;
    }

    void fulfillJson(route, []);
  });

  return () => basketMutationRequests;
};

test("opens a Telegram confirmation without touching the cart", async ({
  page,
}) => {
  const getBasketRequests = await mockCatalog(
    page,
    "  https://t.me/telegram_seller  ",
  );

  await page.goto("/catalog/search?query=telegram", {
    waitUntil: "domcontentloaded",
  });

  await page.getByRole("button", { name: "Купить" }).click();

  const dialog = page.getByRole("dialog", { name: "Покупка через Telegram" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(
      "Данный товар можно приобрести только через telegram канал продавца. Перейти на канал продавца для уточнения наличия?",
    ),
  ).toBeVisible();

  const externalLink = dialog.getByRole("link", {
    name: "Перейти в Telegram",
  });
  await expect(externalLink).toHaveAttribute(
    "href",
    "https://t.me/telegram_seller",
  );
  await expect(externalLink).toHaveAttribute("target", "_blank");
  await expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
  expect(getBasketRequests()).toBe(0);

  await dialog.getByRole("button", { name: "Отмена" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/catalog\/search\?query=telegram$/);
});

test("disables external purchase when the URL is unsafe", async ({ page }) => {
  const getBasketRequests = await mockCatalog(page, "javascript:alert(1)");

  await page.goto("/catalog/search?query=telegram", {
    waitUntil: "domcontentloaded",
  });

  const purchaseButton = page.getByRole("button", { name: "Купить" });
  await expect(purchaseButton).toBeDisabled();
  await purchaseButton.hover({ force: true });
  await expect(
    page.getByText("Продавец не указал корректную ссылку"),
  ).toBeVisible();
  expect(getBasketRequests()).toBe(0);
});

test("keeps an own external product disabled", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  const getBasketRequests = await mockCatalog(
    page,
    "https://t.me/telegram_seller",
  );
  await page.route("**/auth/profile", (route) =>
    void fulfillJson(route, {
      id: 10,
      fullName: "Продавец",
      login: "telegram-seller",
      role: "USER",
      email: "seller@example.com",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    }),
  );

  await page.goto("/catalog/search?query=telegram", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("button", { name: "Ваш товар" }),
  ).toBeDisabled();
  expect(getBasketRequests()).toBe(0);
});
