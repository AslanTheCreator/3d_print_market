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
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const fixtureAvailable =
  !process.env.TEST_BASE_URL ||
  Boolean(process.env.PLAYWRIGHT_FIXTURE_API_URL);

const expectNoNestedButtons = async (page: Page) => {
  await expect(page.locator("button button")).toHaveCount(0);
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
      value: "favorite-control-test-token",
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

const favoriteProduct = {
  id: 902,
  name: "Карточка с избранным",
  count: 5,
  price: 1500,
  prepaymentAmount: 0,
  currency: "RUB",
  categories: [{ id: 1, name: "Фигурки", childs: [] }],
  imageId: 0,
  sellerId: 200,
  expirationDate: "2030-01-01T00:00:00.000Z",
  status: "ACTIVE",
  availability: "PURCHASABLE",
  externalUrl: "",
  sellerLogin: "favorite-seller",
  sellerRating: 5,
  totalReviews: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
};

test("product gallery exposes named native controls with single keyboard actions", async ({
  page,
}) => {
  test.skip(!fixtureAvailable, "Product fixture is not configured");

  await page.goto("/catalog/901/detail", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("load");
  await page.waitForTimeout(1000);

  const gallery = page.getByTestId("product-gallery");
  const openFullscreen = gallery.getByTestId("gallery-image-trigger");

  await expect(openFullscreen).toBeVisible({ timeout: 15_000 });
  await expect(openFullscreen).toHaveAttribute(
    "aria-label",
    "Открыть полноэкранную галерею",
  );
  await expect(openFullscreen).toHaveCSS("cursor", "pointer");
  await expect(gallery.locator(".gallery-open-button")).toHaveCount(0);
  await expectNoNestedButtons(page);

  await openFullscreen.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 / 2", { exact: true })).toBeVisible();
  await expectNoNestedButtons(page);

  const next = dialog.getByRole("button", {
    name: "Следующее изображение",
  });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByText("2 / 2", { exact: true })).toBeVisible();

  const previous = dialog.getByRole("button", {
    name: "Предыдущее изображение",
  });
  await previous.focus();
  await page.keyboard.press("Space");
  await expect(dialog.getByText("1 / 2", { exact: true })).toBeVisible();

  await expect(
    dialog.getByRole("button", {
      name: "Показать изображение 1 из 2",
    }),
  ).toHaveAttribute("aria-current", "true");

  const close = dialog.getByRole("button", {
    name: "Закрыть полноэкранную галерею",
  });
  await close.focus();
  await page.keyboard.press("Space");
  await expect(dialog).toBeHidden();
});

test("price filter clear action is a separate keyboard button", async ({
  page,
}) => {
  await page.route("**/products/find", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    }),
  );

  await page.goto("/catalog/search?query=keyboard", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("load");
  await page.waitForTimeout(500);

  const trigger = page.getByTestId("price-range-trigger");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("textbox", { name: "От" }).fill("100");
  const apply = page.getByRole("button", { name: "Готово" });
  await apply.focus();
  await page.keyboard.press("Space");

  await expect(trigger).toContainText("100");
  const clear = page.getByRole("button", {
    name: "Сбросить фильтр цены",
  });
  await expect(clear).toBeVisible();
  await expectNoNestedButtons(page);

  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(clear).toHaveCount(0);
  await expect(trigger).not.toContainText("100");
});

test("catalog favorite action keeps a transparent frame and keyboard behavior", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);

  let favorites: (typeof favoriteProduct)[] = [];
  const mutationMethods: string[] = [];

  await page.route("**/products/find", (route) =>
    void fulfillJson(route, [favoriteProduct]),
  );
  await page.route("**/auth/profile", (route) =>
    void fulfillJson(route, {
      id: 100,
      fullName: "Тестовый покупатель",
      login: "favorite-buyer",
      role: "USER",
      email: "buyer@example.com",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    }),
  );
  await page.route("**/basket/find", (route) => void fulfillJson(route, []));
  await page.route("**/favorites/find", (route) =>
    void fulfillJson(route, favorites),
  );
  await page.route(/\/favorites\?productId=902$/, (route) => {
    const method = route.request().method();

    if (method === "POST") {
      mutationMethods.push(method);
      favorites = [favoriteProduct];
    } else if (method === "DELETE") {
      mutationMethods.push(method);
      favorites = [];
    }

    void fulfillJson(route, null);
  });

  await page.goto("/catalog/search?query=fixture", {
    waitUntil: "domcontentloaded",
  });

  const addButton = page.getByRole("button", {
    name: "Добавить в избранное",
  });

  await expect(addButton).toBeVisible();
  await expect(addButton).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(addButton).toHaveCSS("backdrop-filter", "none");
  await expect(addButton.locator("svg")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(
    addButton.locator('[data-testid="FavoriteIcon"]'),
  ).toHaveCount(1);

  await addButton.hover();
  await expect(addButton).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );

  const box = await addButton.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);

  await addButton.focus();
  await expect(addButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect.poll(() => mutationMethods).toEqual(["POST"]);
  const removeButton = page.getByRole("button", {
    name: "Удалить из избранного",
  });
  await expect(removeButton).toBeVisible();

  await removeButton.click();

  await expect.poll(() => mutationMethods).toEqual(["POST", "DELETE"]);
  await expect(addButton).toBeVisible();
  await expect(page).toHaveURL(/\/catalog\/search\?query=fixture$/);
});
