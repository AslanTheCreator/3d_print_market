import {
  devices,
  expect,
  type Page,
  type Route,
  type TestInfo,
  test,
} from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.setTimeout(60_000);

const fixtureAvailable =
  !process.env.TEST_BASE_URL ||
  Boolean(process.env.PLAYWRIGHT_FIXTURE_API_URL);

const fixtureProduct = {
  id: 901,
  name: "Тестовая коллекционная фигурка",
  count: 2,
  price: 12990,
  prepaymentAmount: 2990,
  currency: "RUB",
  categories: [{ id: 32, name: "Фигурки", childs: [] }],
  imageId: 9011,
  sellerId: 77,
  expirationDate: "2030-01-01T00:00:00.000Z",
  status: "ACTIVE",
  availability: "PURCHASABLE",
  externalUrl: "",
  sellerLogin: "fixture-seller",
  sellerRating: 4.8,
  totalReviews: 0,
  createdAt: "2030-01-01T00:00:00.000Z",
};

const fixtureImage =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#f9a8d4"/></svg>',
  ).toString("base64");

const fixtureImageMetadata = {
  id: 9011,
  originalUrl: fixtureImage,
  mediumUrl: fixtureImage,
  thumbnailUrl: fixtureImage,
  width: 1200,
  height: 900,
  contentType: "image/svg+xml",
};

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

const mockCatalogApi = async (page: Page) => {
  await page.route("**/products/find", (route) =>
    void fulfillJson(route, [fixtureProduct]),
  );
  await page.route("**/images/metadata?ids=*", (route) =>
    void fulfillJson(route, [fixtureImageMetadata]),
  );
};

const installDiagnostics = async (page: Page) => {
  const hydrationMessages: string[] = [];
  const pageErrors: string[] = [];
  const failedResources: string[] = [];
  const hydrationPattern =
    /hydration|did not match|server rendered html|hydrated but some attributes/i;

  await page.route("https://mc.yandex.ru/metrika/tag.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "",
    }),
  );

  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      hydrationPattern.test(message.text())
    ) {
      hydrationMessages.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (
      ["script", "stylesheet", "font", "image"].includes(
        request.resourceType(),
      )
    ) {
      failedResources.push(
        `${request.resourceType()}: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
      );
    }
  });

  await page.addInitScript(() => {
    type MetricsWindow = typeof window & {
      __mobileRenderingMetrics?: {
        layoutShifts: Array<{ startTime: number; value: number }>;
        lcp: number;
      };
    };

    const metricsWindow = window as MetricsWindow;
    metricsWindow.__mobileRenderingMetrics = {
      layoutShifts: [],
      lcp: 0,
    };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };

        if (!shift.hadRecentInput) {
          metricsWindow.__mobileRenderingMetrics?.layoutShifts.push({
            startTime: shift.startTime,
            value: shift.value,
          });
        }
      }
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries.at(-1);

      if (lastEntry && metricsWindow.__mobileRenderingMetrics) {
        metricsWindow.__mobileRenderingMetrics.lcp = lastEntry.startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  return { hydrationMessages, pageErrors, failedResources };
};

const waitForStableFrame = async (page: Page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });

  const headerBrandImage = page
    .getByTestId("site-header")
    .locator("img:visible")
    .first();
  if ((await headerBrandImage.count()) > 0) {
    await headerBrandImage.evaluate(async (element) => {
      const image = element as HTMLImageElement;

      if (!image.complete || image.naturalWidth === 0) {
        await image.decode();
      }
    });
  }
};

const getPerformanceMetrics = async (page: Page) =>
  page.evaluate(() => {
    type MetricsWindow = typeof window & {
      __mobileRenderingMetrics?: {
        layoutShifts: Array<{ startTime: number; value: number }>;
        lcp: number;
      };
    };

    const metrics = (window as MetricsWindow).__mobileRenderingMetrics ?? {
      layoutShifts: [],
      lcp: 0,
    };
    const shifts = [...metrics.layoutShifts].sort(
      (left, right) => left.startTime - right.startTime,
    );
    let maximumSessionValue = 0;
    let sessionValue = 0;
    let sessionStart = 0;
    let previousShift = 0;

    for (const shift of shifts) {
      const startsNewSession =
        sessionValue === 0 ||
        shift.startTime - previousShift >= 1000 ||
        shift.startTime - sessionStart > 5000;

      if (startsNewSession) {
        sessionStart = shift.startTime;
        sessionValue = shift.value;
      } else {
        sessionValue += shift.value;
      }

      previousShift = shift.startTime;
      maximumSessionValue = Math.max(maximumSessionValue, sessionValue);
    }

    const resources = performance
      .getEntriesByType("resource")
      .map((entry) => entry as PerformanceResourceTiming)
      .filter((entry) =>
        ["script", "css", "font", "img", "link"].includes(
          entry.initiatorType,
        ),
      )
      .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
      }));

    return {
      cls: maximumSessionValue,
      lcp: metrics.lcp,
      transferSize: resources.reduce(
        (total, resource) => total + resource.transferSize,
        0,
      ),
      resources,
    };
  });

const attachPerformanceMetrics = async (
  testInfo: TestInfo,
  name: string,
  metrics: Awaited<ReturnType<typeof getPerformanceMetrics>>,
) => {
  const outputPath = testInfo.outputPath(name);
  await writeFile(outputPath, JSON.stringify(metrics, null, 2), "utf8");
  await testInfo.attach(name, {
    path: outputPath,
    contentType: "application/json",
  });
};

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
};

const expectCleanDiagnostics = (
  diagnostics: Awaited<ReturnType<typeof installDiagnostics>>,
) => {
  expect(diagnostics.hydrationMessages).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedResources).toEqual([]);
};

test("mobile streamed SSR fallback exposes progressive navigation without JavaScript", async ({
  browser,
  baseURL,
}) => {
  test.skip(!fixtureAvailable, "SSR fixture is not configured");

  const context = await browser.newContext({
    ...devices["Pixel 5"],
    javaScriptEnabled: false,
  });
  const page = await context.newPage();

  try {
    const favoritesResponse = await page.goto(`${baseURL}/favorites`, {
      waitUntil: "domcontentloaded",
    });
    expect(favoritesResponse?.ok()).toBe(true);
    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(page.getByTestId("site-header").locator("input")).toHaveCount(0);
    const mobileBrandLink = page.getByRole("link", {
      name: "Figurzilla — главная страница",
    });
    const mobileBrandSource = await mobileBrandLink
      .locator("img")
      .getAttribute("src");
    expect(mobileBrandSource).not.toBeNull();
    expect(decodeURIComponent(mobileBrandSource ?? "")).toContain("site");

    const mobileNavigation = page.getByRole("navigation", {
      name: "Основная навигация",
    });
    await expect(mobileNavigation).toBeVisible();
    await expect(
      mobileNavigation.getByRole("link", { name: "Категории" }),
    ).toHaveAttribute("href", "/catalog/search");
    await expect(
      mobileNavigation.getByRole("link", { name: "Избранное" }),
    ).toHaveAttribute("aria-current", "page");
    await expectNoHorizontalOverflow(page);

    const productResponse = await page.goto(
      `${baseURL}/catalog/901/detail`,
      { waitUntil: "domcontentloaded" },
    );
    expect(productResponse?.ok()).toBe(true);
    await expect(page.getByTestId("product-details-skeleton")).toBeVisible();
    await expect(page.getByTestId("product-details")).toBeHidden();

    const [galleryBox, titleBox, purchaseGeometry] = await Promise.all([
      page.getByTestId("product-details-skeleton-gallery").boundingBox(),
      page.getByTestId("product-details-skeleton-title").boundingBox(),
      page
        .getByTestId("product-details-skeleton-purchase-action")
        .evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            bottom: rect.bottom,
            position: getComputedStyle(element).position,
            viewportHeight: window.innerHeight,
          };
        }),
    ]);
    expect(galleryBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(galleryBox!.y).toBeLessThan(titleBox!.y);
    expect(purchaseGeometry.position).toBe("fixed");
    expect(
      Math.abs(purchaseGeometry.viewportHeight - purchaseGeometry.bottom),
    ).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
  } finally {
    await context.close();
  }
});

test("cold mobile hydration stays stable and loads one compact brand", async ({
  page,
}, testInfo) => {
  const diagnostics = await installDiagnostics(page);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  const cdp = await page.context().newCDPSession(page);

  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1_600_000 * 1024) / 8 / 1000,
    uploadThroughput: (750_000 * 1024) / 8 / 1000,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("site-header")).toBeVisible();
  await expect(page.getByRole("button", { name: "Открыть поиск" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Основная навигация" }),
  ).toBeVisible();
  await page.waitForLoadState("load");
  await page.waitForTimeout(250);
  await waitForStableFrame(page);

  const metrics = await getPerformanceMetrics(page);
  await attachPerformanceMetrics(
    testInfo,
    "about-mobile-performance.json",
    metrics,
  );

  const decodedRequests = requestedUrls.map((url) => decodeURIComponent(url));
  const currentLogoSource = decodeURIComponent(
    await page
      .getByRole("link", { name: "Figurzilla — главная страница" })
      .locator("img")
      .evaluate(
      (image) => (image as HTMLImageElement).currentSrc,
    ),
  );

  expect(metrics.cls).toBeLessThanOrEqual(0.1);
  expect(currentLogoSource).toContain("site.");
  expect(decodedRequests.some((url) => url.includes("logo-desktop"))).toBe(
    false,
  );
  expect(
    decodedRequests.some((url) => /\/logo\.[^/]*\.svg(?:\?|$)/i.test(url)),
  ).toBe(false);
  expect(
    decodedRequests.some((url) => url.includes("site.") && url.includes(".png")),
  ).toBe(true);
  expectCleanDiagnostics(diagnostics);
});

test("cold desktop art direction does not load compact-only assets", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    ...devices["Desktop Chrome"],
    viewport: { width: 900, height: 800 },
  });
  const page = await context.newPage();
  const requestedUrls: string[] = [];

  try {
    const diagnostics = await installDiagnostics(page);
    page.on("request", (request) => requestedUrls.push(request.url()));

    await page.goto(`${baseURL}/about`, { waitUntil: "load" });
    await waitForStableFrame(page);

    const decodedRequests = requestedUrls.map((url) => decodeURIComponent(url));
    const currentLogoSource = decodeURIComponent(
      await page.getByTestId("header-brand").locator("img").evaluate(
        (image) => (image as HTMLImageElement).currentSrc,
      ),
    );

    expect(currentLogoSource).toContain("logo-desktop");
    expect(
      decodedRequests.some((url) => url.includes("logo-desktop")),
    ).toBe(true);
    expect(
      decodedRequests.some((url) =>
        /\/logo\.[^/]*\.svg(?:\?|$)/i.test(url),
      ),
    ).toBe(false);
    expect(
      decodedRequests.some((url) =>
        /\/site\.[^/]*\.png(?:\?|$)/i.test(url),
      ),
    ).toBe(false);
    await expectNoHorizontalOverflow(page);
    expectCleanDiagnostics(diagnostics);
  } finally {
    await context.close();
  }
});

test("public routes render the expected mobile chrome", async ({ page }) => {
  const cases = [
    {
      path: "/favorites",
      mode: "browse",
      label: null,
      showBottomNavigation: true,
      showFooter: true,
    },
    {
      path: "/sellers/77",
      mode: "context",
      label: "Категории",
      showBottomNavigation: true,
      showFooter: true,
    },
    {
      path: "/catalog/901/detail",
      mode: "context",
      label: "Категории",
      showBottomNavigation: false,
      showFooter: false,
    },
    {
      path: "/checkout",
      mode: "focused",
      label: "Корзина",
      showBottomNavigation: false,
      showFooter: false,
    },
    {
      path: "/auth/login",
      mode: "auth",
      label: "Figurzilla",
      showBottomNavigation: false,
      showFooter: false,
    },
    {
      path: "/about",
      mode: "context",
      label: "Figurzilla",
      showBottomNavigation: false,
      showFooter: true,
    },
    {
      path: "/missing-mobile-shell-route",
      mode: "browse",
      label: null,
      showBottomNavigation: true,
      showFooter: true,
    },
  ] as const;

  await page.setViewportSize({ width: 393, height: 727 });

  for (const routeCase of cases) {
    await page.goto(routeCase.path, { waitUntil: "domcontentloaded" });

    const chrome = page.getByTestId("app-chrome");
    const mobileHeader = page.getByTestId("mobile-site-header");
    const bottomNavigation = page.locator(
      'nav[aria-label="Основная навигация"]',
    );

    await expect(chrome).toHaveAttribute(
      "data-mobile-chrome-mode",
      routeCase.mode,
    );
    await expect(mobileHeader).toBeVisible();

    if (routeCase.mode === "browse") {
      await expect(
        mobileHeader.getByRole("button", { name: "Открыть поиск" }),
      ).toBeVisible();
    } else {
      await expect(
        mobileHeader.getByRole("button", {
          name: `Назад: ${routeCase.label}`,
        }),
      ).toBeVisible();

      if (routeCase.mode !== "auth") {
        await expect(
          mobileHeader.getByText(routeCase.label!, { exact: true }),
        ).toBeVisible();
      }
    }

    if (routeCase.showBottomNavigation) {
      await expect(bottomNavigation).toBeVisible();
    } else {
      await expect(bottomNavigation).toBeHidden();
    }

    if (routeCase.showFooter) {
      await expect(page.locator("footer")).toBeVisible();
    } else {
      await expect(page.locator("footer")).toBeHidden();
    }

    await expectNoHorizontalOverflow(page);
  }
});

test("dashboard subroutes keep the contextual account menu", async ({
  context,
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Playwright baseURL is required");

  await context.addCookies([
    {
      name: "access_token",
      value: "mobile-account-menu-token",
      url: baseURL,
    },
  ]);
  await page.route("**/auth/profile", (route) =>
    void fulfillJson(route, {
      id: 1,
      fullName: "Mobile User",
      login: "mobile-user",
      role: "USER",
      email: "mobile@example.com",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    }),
  );
  await page.route("**/participant", (route) =>
    void fulfillJson(route, {
      id: 1,
      login: "mobile-user",
      mail: "mobile@example.com",
      fullName: "Mobile User",
      phoneNumber: "",
      status: "ACTIVE",
      sellerStatus: "DEFAULT",
      averageRating: 0,
      totalReviews: 0,
      imageId: null,
      image: [],
      addresses: [],
      accounts: [],
      transfers: [],
      socialNetworks: [],
    }),
  );
  for (const url of [
    "**/basket/find",
    "**/favorites/find",
    "**/products/my",
    "**/order/customer",
    "**/order/seller",
  ]) {
    await page.route(url, (route) => void fulfillJson(route, []));
  }

  await page.setViewportSize({ width: 393, height: 727 });
  await page.goto("/dashboard/purchase", { waitUntil: "domcontentloaded" });

  const mobileHeader = page.getByTestId("mobile-site-header");
  const menuTrigger = mobileHeader.getByRole("button", {
    name: "Открыть меню разделов профиля",
  });
  const bottomNavigation = page.locator(
    'nav[aria-label="Основная навигация"]',
  );

  await expect(page.getByTestId("app-chrome")).toHaveAttribute(
    "data-mobile-chrome-mode",
    "account",
  );
  await expect(mobileHeader.getByRole("heading", { name: "Покупки", exact: true })).toBeVisible();
  await expect(menuTrigger).toBeVisible();
  await expect(bottomNavigation).toBeVisible();
  await expect(
    bottomNavigation.getByRole("link", { name: "Профиль", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator("footer")).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Навигация личного кабинета" }),
  ).toHaveCount(0);

  await menuTrigger.click();
  const accountDialog = page
    .locator("#mobile-account-menu")
    .getByRole("dialog");
  await expect(accountDialog).toBeVisible();
  const accountDialogBox = await accountDialog.boundingBox();
  expect(accountDialogBox).not.toBeNull();
  expect(Math.abs(accountDialogBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(accountDialogBox!.width - 393)).toBeLessThanOrEqual(1);
  expect(Math.abs(accountDialogBox!.height - 727)).toBeLessThanOrEqual(1);
  for (const label of [
    "Обзор",
    "Мои товары",
    "Покупки",
    "Продажи",
    "Создать товар",
    "Настройки",
    "Безопасность",
    "Выйти",
  ]) {
    await expect(accountDialog.getByText(label, { exact: true })).toBeVisible();
  }

  await accountDialog
    .getByRole("button", { name: "Закрыть меню профиля" })
    .click();
  await expect(accountDialog).toBeHidden();
  await expect(menuTrigger).toBeFocused();

  await page.route("**/auth/login", async (route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    await fulfillJson(route, {
      access_token: "mobile-account-relogin-token",
      refresh_token: "mobile-account-refresh-token",
    });
  });
  await menuTrigger.click();
  await accountDialog.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/);
  await page.getByLabel(/^Email/).fill("mobile@example.com");
  await page.getByLabel(/^Пароль/).fill("password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL((url) =>
    ["/", "/dashboard", "/dashboard/purchase"].includes(url.pathname),
  );
  if (new URL(page.url()).pathname !== "/dashboard") {
    await bottomNavigation.getByRole("link", { name: "Профиль", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(menuTrigger).toBeHidden();
  await page
    .getByRole("navigation", { name: "Разделы личного кабинета" })
    .getByRole("link", { name: "Покупки", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "У вас пока нет покупок" })).toBeVisible();
  await menuTrigger.click();
  await expect(
    accountDialog.getByRole("button", { name: "Выйти", exact: true }),
  ).toBeEnabled();
});

test("mobile search uses a fullscreen dialog and desktop keeps inline search", async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);

  await page.setViewportSize({ width: 899, height: 800 });
  await page.goto("/catalog/search?query=fixture", {
    waitUntil: "domcontentloaded",
  });

  const mobileSearchTrigger = page.getByRole("button", {
    name: "Открыть поиск",
  });
  await expect(mobileSearchTrigger).toBeVisible();
  await mobileSearchTrigger.click();

  const mobileSearchDialog = page.getByRole("dialog", { name: "Поиск" });
  const mobileSearch = mobileSearchDialog.getByRole("combobox", {
    name: "поиск по сайту",
  });
  await expect(mobileSearchDialog).toBeVisible();
  const mobileSearchDialogBox = await mobileSearchDialog.boundingBox();
  expect(mobileSearchDialogBox).not.toBeNull();
  expect(Math.abs(mobileSearchDialogBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileSearchDialogBox!.width - 899)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileSearchDialogBox!.height - 800)).toBeLessThanOrEqual(1);
  await expect(mobileSearch).toHaveValue("fixture");
  await expect(mobileSearch).toHaveAttribute("type", "search");
  await expect(mobileSearch).toHaveAttribute("enterkeyhint", "search");
  await mobileSearchDialog.getByRole("button", { name: "Закрыть поиск" }).click();
  await expect(mobileSearchDialog).toBeHidden();
  await expect(mobileSearchTrigger).toBeFocused();

  await page.setViewportSize({ width: 900, height: 800 });
  await waitForStableFrame(page);
  await expect(mobileSearchTrigger).toBeHidden();
  await expect(
    page.getByTestId("header-search-surface").getByRole("combobox", {
      name: "поиск по сайту",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Открыть категории", exact: true }).click();
  const desktopCategories = page.getByTestId("categories-drawer-content");
  await expect(desktopCategories).toBeVisible();

  await page.setViewportSize({ width: 899, height: 800 });
  await waitForStableFrame(page);
  await expect(desktopCategories).toBeHidden();
  await expect(mobileSearchTrigger).toBeVisible();

  expectCleanDiagnostics(diagnostics);
});

test("pending actions stay desktop-only while mobile profile remains lightweight", async ({
  page,
  baseURL,
}) => {
  const diagnostics = await installDiagnostics(page);
  let sellerOrderRequests = 0;
  let customerOrderRequests = 0;
  let userProductRequests = 0;

  await page.context().addCookies([
    {
      name: "access_token",
      value: "playwright-access-token",
      url: baseURL!,
    },
  ]);
  await page.route("**/order/seller", (route) => {
    sellerOrderRequests += 1;
    return void fulfillJson(route, [
      {
        actualStatus: "BOOKED",
        product: { imageId: 0 },
      },
    ]);
  });
  await page.route("**/order/customer", (route) => {
    customerOrderRequests += 1;
    return void fulfillJson(route, []);
  });
  await page.route("**/products/my", (route) => {
    userProductRequests += 1;
    return void fulfillJson(route, []);
  });
  await page.route("**/favorites/find", (route) => void fulfillJson(route, []));
  await page.route("**/basket/find", (route) => void fulfillJson(route, []));
  await page.route("**/images/metadata?ids=*", (route) =>
    void fulfillJson(route, []),
  );

  await page.setViewportSize({ width: 899, height: 800 });
  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(250);

  const mobileNavigation = page.locator(
    'nav[aria-label="Основная навигация"]',
  );
  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Профиль" }),
  ).toHaveAttribute("href", "/dashboard");
  expect(sellerOrderRequests).toBe(0);
  expect(customerOrderRequests).toBe(0);
  expect(userProductRequests).toBe(0);

  await page.setViewportSize({ width: 900, height: 800 });
  await waitForStableFrame(page);

  const header = page.getByTestId("site-header");
  const profileLink = header.getByRole("link", { name: "Профиль" });
  await expect(profileLink).toHaveAttribute("href", "/dashboard");
  await expect(profileLink.locator(".MuiBadge-badge")).toHaveText("1");

  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");

    if (
      await profileLink.evaluate(
        (element) => document.activeElement === element,
      )
    ) {
      break;
    }
  }
  await expect(profileLink).toBeFocused();

  const popover = page.getByTestId("pending-actions-popover");
  await expect(popover).toBeVisible();
  await expect(popover.getByText("Подтвердить заказ")).toBeVisible();
  expect(sellerOrderRequests).toBeGreaterThan(0);
  expect(customerOrderRequests).toBeGreaterThan(0);
  expect(userProductRequests).toBeGreaterThan(0);

  await page.setViewportSize({ width: 899, height: 800 });
  await expect(popover).toBeHidden();
  await expect(mobileNavigation).toBeVisible();

  expectCleanDiagnostics(diagnostics);
});

test("product state survives orientation and product breakpoints", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureAvailable, "SSR fixture is not configured");
  const diagnostics = await installDiagnostics(page);

  await page.goto("/catalog/901/detail", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("product-details")).toBeVisible();
  await page.waitForLoadState("load");
  await page.waitForTimeout(1000);
  await waitForStableFrame(page);

  const performanceMetrics = await getPerformanceMetrics(page);
  await attachPerformanceMetrics(
    testInfo,
    "product-detail-mobile-performance.json",
    performanceMetrics,
  );
  expect(performanceMetrics.cls).toBeLessThanOrEqual(0.1);

  const gallery = page.getByTestId("product-gallery");
  const thumbnails = gallery.locator("button[aria-pressed]");
  await expect(thumbnails).toHaveCount(2);
  const secondThumbnail = thumbnails.nth(1);
  await secondThumbnail.click();
  await expect(secondThumbnail).toHaveAttribute("aria-pressed", "true");
  await gallery.evaluate((element) => {
    (
      window as typeof window & {
        __responsiveGalleryNode?: Element;
      }
    ).__responsiveGalleryNode = element;
  });

  const descriptionToggle = page.getByTestId("product-description-toggle");
  await descriptionToggle.scrollIntoViewIfNeeded();
  await descriptionToggle.click();
  await expect(descriptionToggle).toHaveAttribute("aria-expanded", "true");

  await gallery
    .getByRole("button", { name: "Открыть полноэкранную галерею" })
    .click();
  const fullscreenDialog = page.getByRole("dialog");
  await expect(fullscreenDialog).toBeVisible();
  await expect(fullscreenDialog.getByText("2 / 2")).toBeVisible();

  for (const viewport of [
    { width: 727, height: 393 },
    { width: 600, height: 800 },
    { width: 599, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await waitForStableFrame(page);
    await expect(fullscreenDialog).toBeVisible();
    await expect(fullscreenDialog.getByText("2 / 2")).toBeVisible();
  }

  await fullscreenDialog
    .getByRole("button", { name: "Закрыть полноэкранную галерею" })
    .click();
  await expect(fullscreenDialog).toBeHidden();

  for (const viewport of [
    { width: 727, height: 393 },
    { width: 599, height: 800 },
    { width: 600, height: 800 },
    { width: 1375, height: 900 },
    { width: 1376, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await waitForStableFrame(page);
    await expect(page.getByTestId("product-gallery")).toHaveCount(1);
    await expect(page.getByTestId("product-purchase-action")).toHaveCount(1);
    await expect(page.getByTestId("product-favorite-action")).toHaveCount(1);
    await expect(secondThumbnail).toHaveAttribute("aria-pressed", "true");
    await expect(descriptionToggle).toHaveAttribute("aria-expanded", "true");
    expect(
      await gallery.evaluate(
        (element) =>
          (
            window as typeof window & {
              __responsiveGalleryNode?: Element;
            }
          ).__responsiveGalleryNode === element,
      ),
    ).toBe(true);
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 599, height: 800 });
  const openReviewsButton = page.getByRole("button", {
    name: "Все",
    exact: true,
  });
  await openReviewsButton.scrollIntoViewIfNeeded();
  await openReviewsButton.click();
  const reviewsDrawer = page.getByTestId("product-reviews-drawer");
  await expect(reviewsDrawer).toBeVisible();

  for (const width of [600, 599]) {
    await page.setViewportSize({ width, height: 800 });
    await waitForStableFrame(page);
    await expect(reviewsDrawer).toBeVisible();
  }

  await reviewsDrawer
    .getByRole("button", { name: "Закрыть отзывы" })
    .click();
  await expect(reviewsDrawer).toBeHidden();

  await page
    .getByTestId("product-favorite-action")
    .getByRole("button")
    .click();
  const authDialog = page.getByRole("dialog");
  await expect(authDialog).toBeVisible();
  await authDialog.evaluate((element) => {
    (
      window as typeof window & {
        __responsiveAuthDialogNode?: Element;
      }
    ).__responsiveAuthDialogNode = element;
  });

  for (const width of [600, 1376, 599]) {
    await page.setViewportSize({ width, height: 800 });
    await waitForStableFrame(page);
    await expect(authDialog).toBeVisible();
    expect(
      await authDialog.evaluate(
        (element) =>
          (
            window as typeof window & {
              __responsiveAuthDialogNode?: Element;
            }
          ).__responsiveAuthDialogNode === element,
      ),
    ).toBe(true);
  }

  await authDialog.getByRole("button", { name: "Отмена" }).click();
  await expect(authDialog).toBeHidden();
  expectCleanDiagnostics(diagnostics);
});

test("responsive boundaries and the catalog grid do not overflow", async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });

  const header = page.getByTestId("site-header");
  const mobileHeader = page.getByTestId("mobile-site-header");
  const mobileSearchTrigger = page.getByRole("button", {
    name: "Открыть поиск",
  });
  const desktopSearch = page
    .getByTestId("header-search-surface")
    .getByRole("combobox", { name: "поиск по сайту" });
  const mobileNavigation = page.getByRole("navigation", {
    name: "Основная навигация",
  });

  for (const width of [
    320,
    393,
    599,
    600,
    768,
    899,
    900,
    1375,
    1376,
    1535,
    1536,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await waitForStableFrame(page);

    if (width < 900) {
      await expect(mobileHeader).toBeVisible();
      await expect(mobileSearchTrigger).toBeVisible();
      await expect(desktopSearch).toBeHidden();
      await expect(mobileNavigation).toBeVisible();

      const mobileHeaderBox = await mobileHeader.boundingBox();
      expect(mobileHeaderBox).not.toBeNull();
      expect(mobileHeaderBox!.height).toBe(width < 600 ? 56 : 64);
    } else {
      await expect(mobileHeader).toBeHidden();
      await expect(mobileSearchTrigger).toBeHidden();
      await expect(desktopSearch).toBeVisible();
      await expect(mobileNavigation).toBeHidden();

      const desktopHeaderBox = await header.boundingBox();
      expect(desktopHeaderBox).not.toBeNull();
      expect(desktopHeaderBox!.height).toBe(119);
    }

    await expectNoHorizontalOverflow(page);
  }

  const safeAreaSession = await page.context().newCDPSession(page);
  try {
    await page.setViewportSize({ width: 393, height: 800 });
    await safeAreaSession.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 24, right: 0, bottom: 20, left: 0 },
    });
    await waitForStableFrame(page);

    const [safeHeaderBox, safeNavigationBox] = await Promise.all([
      header.boundingBox(),
      mobileNavigation.boundingBox(),
    ]);
    expect(safeHeaderBox).not.toBeNull();
    expect(safeNavigationBox).not.toBeNull();
    expect(Math.abs(safeHeaderBox!.height - 80)).toBeLessThanOrEqual(1);
    expect(Math.abs(safeNavigationBox!.height - 84)).toBeLessThanOrEqual(1);
    expect(safeNavigationBox!.y + safeNavigationBox!.height).toBeCloseTo(
      800,
      0,
    );
  } finally {
    await safeAreaSession.send("Emulation.setSafeAreaInsetsOverride", {
      insets: {},
    });
    await safeAreaSession.detach();
  }

  await page.evaluate(() => {
    document.body.style.minHeight = "2000px";
    window.scrollTo(0, 0);
  });
  await page.setViewportSize({ width: 600, height: 800 });
  await waitForStableFrame(page);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(100);
  await expect(header).not.toHaveAttribute("data-hidden", "true");
  expect((await header.boundingBox())?.y).toBe(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 599, height: 800 });
  await waitForStableFrame(page);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(header).not.toHaveAttribute("data-hidden", "true");
  expect((await header.boundingBox())?.y).toBe(0);

  await mockCatalogApi(page);
  await page.goto("/catalog/search?query=fixture", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('a[href="/catalog/901/detail"]')).toBeVisible();

  for (const width of [1375, 1376, 1535, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    await waitForStableFrame(page);
    await expectNoHorizontalOverflow(page);
  }

  expectCleanDiagnostics(diagnostics);
});

test("mobile overlays stay accessible and close without losing the page", async ({
  page,
}) => {
  test.skip(!fixtureAvailable, "SSR fixture is not configured");
  const diagnostics = await installDiagnostics(page);

  await page.route("**/categories", (route) =>
    void fulfillJson(route, [
      {
        id: 32,
        name: "Фигурки",
        childs: [{ id: 33, name: "Аниме", childs: [] }],
      },
    ]),
  );
  await page.route("**/products/names/find?*", (route) =>
    void fulfillJson(route, ["fixture"]),
  );
  await page.setViewportSize({ width: 393, height: 727 });
  await page.goto("/favorites", { waitUntil: "domcontentloaded" });

  const mobileNavigation = page.locator(
    'nav[aria-label="Основная навигация"]',
  );
  const categoriesTrigger = mobileNavigation
    .locator('a[href="/catalog/search"]')
    .filter({ hasText: "Категории" });
  await expect(categoriesTrigger).toHaveAttribute("href", "/catalog/search");
  await expect(categoriesTrigger).toHaveAttribute("aria-haspopup", "dialog");
  await categoriesTrigger.click();

  const categoriesDialog = page
    .locator("#mobile-categories-dialog")
    .getByRole("dialog");
  const categorySearch = categoriesDialog.getByRole("combobox", {
    name: "Поиск товаров",
  });
  await expect(categoriesDialog).toBeVisible();
  await expect(categoriesDialog).toHaveAccessibleName("Категории");
  const categoriesDialogBox = await categoriesDialog.boundingBox();
  expect(categoriesDialogBox).not.toBeNull();
  expect(Math.abs(categoriesDialogBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(categoriesDialogBox!.width - 393)).toBeLessThanOrEqual(1);
  expect(Math.abs(categoriesDialogBox!.height - 727)).toBeLessThanOrEqual(1);
  await expect(categoriesTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(categorySearch).toBeVisible();
  await expect(categorySearch).toHaveAttribute("enterkeyhint", "search");

  const searchBox = await categorySearch.boundingBox();
  const categoryTitleBox = await categoriesDialog
    .getByRole("heading", { name: "Категории" })
    .boundingBox();
  expect(searchBox).not.toBeNull();
  expect(categoryTitleBox).not.toBeNull();
  expect(searchBox!.y).toBeLessThan(categoryTitleBox!.y);

  await categoriesDialog.getByRole("button", { name: "Фигурки" }).click();
  await expect(
    categoriesDialog.getByRole("heading", { name: "Фигурки" }),
  ).toBeVisible();
  await expect(categoriesDialog.getByText("Аниме", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 600, height: 800 });
  await waitForStableFrame(page);
  await expect(categoriesDialog).toBeVisible();
  await expect(categoriesDialog.getByText("Аниме", { exact: true })).toBeVisible();
  await categoriesDialog
    .getByRole("button", { name: "Назад к предыдущему уровню" })
    .click();
  await expect(
    categoriesDialog.getByRole("heading", { name: "Категории" }),
  ).toBeVisible();

  await page.evaluate(() => window.history.forward());
  await expect(
    categoriesDialog.getByRole("heading", { name: "Фигурки" }),
  ).toBeVisible();
  await page.evaluate(() => window.history.back());
  await expect(
    categoriesDialog.getByRole("heading", { name: "Категории" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 899, height: 800 });
  await page.keyboard.press("Escape");
  await expect(categoriesDialog).toBeHidden();
  await expect(categoriesTrigger).toBeFocused();

  await page.setViewportSize({ width: 393, height: 727 });
  await categoriesTrigger.click();
  await page.evaluate(() => window.history.back());
  await expect(categoriesDialog).toBeHidden();
  await expect(categoriesTrigger).toBeFocused();

  await mockCatalogApi(page);
  await categoriesTrigger.click();
  await categorySearch.fill("temporary");
  await categoriesDialog.getByRole("button", { name: "Очистить поиск" }).click();
  await expect(categorySearch).toHaveValue("");
  await categorySearch.fill("fixture");
  await categoriesDialog.getByRole("button", { name: "Найти товары" }).click();
  await expect(page).toHaveURL(/\/catalog\/search\?query=fixture$/);
  await expect(categoriesDialog).toBeHidden();
  await expect(page.locator('a[href="/catalog/901/detail"]')).toBeVisible();
  await expect(categoriesTrigger).toHaveAttribute("aria-current", "page");
  await page.waitForLoadState("load");
  await page.waitForTimeout(250);
  await waitForStableFrame(page);
  expect(
    await page.evaluate(() =>
      window.matchMedia("(max-width:599.95px)").matches,
    ),
  ).toBe(true);
  const priceTrigger = page.getByTestId("price-range-trigger");
  await priceTrigger.click();
  await expect(priceTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Готово" })).toBeVisible();
  const minPriceInput = page.getByRole("textbox", {
    name: "От",
    exact: true,
  });
  const maxPriceInput = page.getByRole("textbox", {
    name: "До",
    exact: true,
  });
  await minPriceInput.fill("1000");
  await maxPriceInput.fill("9000");
  await page.setViewportSize({ width: 600, height: 800 });
  await waitForStableFrame(page);
  await expect(minPriceInput).toHaveValue("1000");
  await expect(maxPriceInput).toHaveValue("9000");
  await expect(page.getByRole("button", { name: "Готово" })).toBeVisible();
  await page.getByRole("button", { name: "Сбросить" }).click();
  await expect(minPriceInput).toHaveValue("");
  await expect(maxPriceInput).toHaveValue("");
  await expect(page.getByRole("button", { name: "Готово" })).toBeVisible();
  await page.getByRole("button", { name: "Закрыть" }).click();
  await expect(page.getByRole("button", { name: "Готово" })).toBeHidden();

  await page.setViewportSize({ width: 393, height: 727 });
  await page.goto("/catalog/901/detail", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("product-details")).toBeVisible();
  await page.waitForLoadState("load");
  await page.waitForTimeout(250);
  await waitForStableFrame(page);
  await expect(
    page.getByRole("navigation", { name: "Основная навигация" }),
  ).toBeHidden();
  await expect(page.getByRole("button", { name: "Назад: Категории" })).toBeVisible();
  await page
    .getByTestId("product-purchase-action")
    .getByRole("button")
    .click();
  const authDialog = page.getByRole("dialog");
  await expect(authDialog).toBeVisible();
  await authDialog.getByRole("button", { name: "Отмена" }).click();
  await expect(authDialog).toBeHidden();
  await expect(page).toHaveURL(/\/catalog\/901\/detail$/);

  expectCleanDiagnostics(diagnostics);
});
