import { expect, type Page, type Route, test } from "@playwright/test";

test.setTimeout(60_000);

const taxonomy = [
  {
    id: 32,
    name: "Фигурки",
    childs: [{ id: 33, name: "Аниме", childs: [] }],
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
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

const categoriesTrigger = (page: Page) =>
  page
    .locator('nav[aria-label="Основная навигация"]')
    .locator('a[href="/catalog/search"]');

const categoriesDialog = (page: Page) =>
  page.locator("#mobile-categories-dialog").getByRole("dialog");

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 727 });
  await page.route("https://mc.yandex.ru/metrika/tag.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.route("**/products/find", (route) => fulfillJson(route, []));
  await page.route("**/products/names/find?*", (route) => fulfillJson(route, []));
});

test("categories opened with Enter show loading and then the taxonomy", async ({
  page,
}) => {
  let releaseCategories: () => void = () => {};
  const categoriesReady = new Promise<void>((resolve) => {
    releaseCategories = resolve;
  });
  await page.route("**/categories", async (route) => {
    if (route.request().method() !== "OPTIONS") await categoriesReady;
    await fulfillJson(route, taxonomy);
  });

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  const trigger = categoriesTrigger(page);
  const dialog = categoriesDialog(page);
  await expect.poll(() => trigger.evaluate((element) =>
    Object.keys(element).some((key) => key.startsWith("__reactProps$")),
  )).toBe(true);
  await trigger.focus();
  await trigger.press("Enter");

  try {
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(
      dialog.getByRole("progressbar", { name: "Загрузка категорий" }),
    ).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Поиск товаров" })).toBeVisible();
    await expect(dialog.getByText("Категории не найдены")).toBeHidden();
    await expect(dialog.getByRole("alert")).toBeHidden();
    await expect(page).toHaveURL(/\/favorites$/);
  } finally {
    releaseCategories();
  }

  await expect(dialog.getByRole("button", { name: "Фигурки" })).toBeVisible();
  await expect(dialog.getByRole("progressbar")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("categories error offers Retry and recovers without closing the menu", async ({
  page,
}) => {
  let shouldSucceed = false;
  let categoriesRequests = 0;
  await page.route("**/categories", async (route) => {
    if (route.request().method() !== "OPTIONS") categoriesRequests += 1;
    await fulfillJson(
      route,
      shouldSucceed
        ? taxonomy
        : {
            code: "SERVICE_UNAVAILABLE",
            message: "Категории временно недоступны",
            status: 503,
            timestamp: "2030-01-01T00:00:00.000Z",
            details: null,
          },
      shouldSucceed ? 200 : 503,
    );
  });

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await categoriesTrigger(page).click();
  const dialog = categoriesDialog(page);
  await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole("progressbar")).toBeHidden();
  await expect(dialog.getByText("Категории не найдены")).toBeHidden();
  const requestsBeforeRetry = categoriesRequests;

  shouldSucceed = true;
  await dialog.getByRole("button", { name: "Повторить" }).click();
  await expect(dialog.getByRole("button", { name: "Фигурки" })).toBeVisible();
  expect(categoriesRequests).toBeGreaterThan(requestsBeforeRetry);
  await expect(dialog.getByRole("alert")).toBeHidden();
  await expect(dialog.getByRole("combobox", { name: "Поиск товаров" })).toBeVisible();
  await expect(page).toHaveURL(/\/favorites$/);
});

test("empty categories keep product search available", async ({ page }) => {
  await page.route("**/categories", (route) => fulfillJson(route, []));
  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await categoriesTrigger(page).click();
  const dialog = categoriesDialog(page);

  await expect(dialog.getByText("Категории не найдены")).toBeVisible();
  await expect(dialog.getByRole("progressbar")).toBeHidden();
  await expect(dialog.getByRole("alert")).toBeHidden();
  await dialog.getByRole("combobox", { name: "Поиск товаров" }).fill("robot");
  await dialog.getByRole("button", { name: "Найти товары" }).click();
  await expect(page).toHaveURL(/\/catalog\/search\?query=robot$/);
  await expect(dialog).toBeHidden();
});

test("leaf category navigates to its hierarchical route and reopening starts at root", async ({
  page,
}) => {
  await page.route("**/categories", (route) => fulfillJson(route, taxonomy));
  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await categoriesTrigger(page).click();
  const dialog = categoriesDialog(page);

  await dialog.getByRole("button", { name: "Фигурки", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Фигурки" })).toBeVisible();
  await expect(page).toHaveURL(/\/favorites$/);
  await dialog.getByRole("button", { name: "Аниме", exact: true }).click();

  await expect
    .poll(() => decodeURIComponent(new URL(page.url()).pathname))
    .toBe("/catalog/category/32-фигурки/33-аниме");
  await expect(dialog).toBeHidden();
  await expect(categoriesTrigger(page)).toHaveAttribute("aria-current", "page");
  await categoriesTrigger(page).click();
  await expect(dialog.getByRole("heading", { name: "Категории" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Фигурки", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Аниме", exact: true })).toBeHidden();
});

test("modified categories click follows the fallback link in a new tab", async ({
  page,
  context,
}) => {
  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  const trigger = categoriesTrigger(page);
  await expect(trigger).toHaveAttribute("href", "/catalog/search");

  const newPagePromise = context.waitForEvent("page");
  await trigger.click({ modifiers: ["ControlOrMeta"] });
  const newPage = await newPagePromise;
  try {
    await expect(newPage).toHaveURL(/\/catalog\/search$/);
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(categoriesDialog(page)).toBeHidden();
  } finally {
    await newPage.close();
  }
});

test("mobile age gate respects shell safe areas and scrolls on a short viewport", async ({
  page,
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Playwright baseURL is required for auth cookies");
  await context.addCookies([
    { name: "access_token", value: "playwright-access-token", url: baseURL },
  ]);
  await page.route("**/categories", (route) =>
    fulfillJson(route, [{ id: 131, name: "18+", childs: [] }]),
  );
  await page.route("**/favorites/find", (route) => fulfillJson(route, []));
  await page.route("**/basket/find", (route) => fulfillJson(route, []));
  const productRequests: unknown[] = [];
  await page.route("**/products/find", async (route) => {
    if (route.request().method() !== "OPTIONS") {
      productRequests.push(route.request().postDataJSON());
    }
    await fulfillJson(route, []);
  });
  await page.setViewportSize({ width: 393, height: 420 });
  const safeAreaSession = await context.newCDPSession(page);

  try {
    await safeAreaSession.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 24, right: 0, bottom: 20, left: 0 },
    });
    await page.goto("/catalog/category/131-18%2B", {
      waitUntil: "domcontentloaded",
    });
    const gate = page.getByTestId("age-verification-gate");
    await expect(gate).toBeVisible();
    const modal = page.locator(".MuiModal-root").filter({ has: gate });
    const header = page.getByTestId("site-header");
    const navigation = page.locator('nav[aria-label="Основная навигация"]');
    const [modalBox, backdropBox, headerBox, navigationBox] = await Promise.all([
      modal.boundingBox(),
      modal.locator(".MuiBackdrop-root").boundingBox(),
      header.boundingBox(),
      navigation.boundingBox(),
    ]);
    expect(modalBox).not.toBeNull();
    expect(backdropBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(headerBox!.height).toBeCloseTo(80, 0);
    expect(navigationBox!.height).toBeCloseTo(84, 0);
    for (const bounds of [modalBox!, backdropBox!]) {
      expect(bounds.y).toBeCloseTo(headerBox!.y + headerBox!.height, 0);
      expect(bounds.y + bounds.height).toBeCloseTo(navigationBox!.y, 0);
    }
    const scrollContainer = gate.locator("..");
    const scrollDimensions = await scrollContainer.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(scrollDimensions.scrollHeight).toBeGreaterThan(scrollDimensions.clientHeight);
    const reject = page.getByTestId("age-verification-reject");
    await reject.scrollIntoViewIfNeeded();
    expect(await scrollContainer.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const rejectBox = await reject.boundingBox();
    expect(rejectBox).not.toBeNull();
    expect(rejectBox!.y).toBeGreaterThanOrEqual(headerBox!.height);
    expect(rejectBox!.y + rejectBox!.height).toBeLessThanOrEqual(navigationBox!.y + 1);

    await page.getByTestId("age-verification-confirm").click();
    await expect(gate).toBeHidden();
    await expect
      .poll(() =>
        productRequests.some(
          (request) =>
            typeof request === "object" &&
            request !== null &&
            "includeAdult" in request &&
            request.includeAdult === true,
        ),
      )
      .toBe(true);
  } finally {
    await safeAreaSession.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    await safeAreaSession.detach();
  }
});
