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

  const headerBrandImage = page.getByTestId("header-brand").locator("img");
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

test("mobile streamed SSR fallback is compact without JavaScript", async ({
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
    const aboutResponse = await page.goto(`${baseURL}/about`, {
      waitUntil: "domcontentloaded",
    });
    expect(aboutResponse?.ok()).toBe(true);
    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(page.getByTestId("site-header").locator("input")).toHaveCount(
      1,
    );
    const mobileBrand = page.getByTestId("header-brand").locator("img");
    const search = page.getByRole("textbox", { name: "поиск по сайту" });
    const topRowBrand = page.getByRole("link", {
      name: "Главная страница",
    });
    const [mobileBrandSource, searchBox, topRowBrandBox] = await Promise.all([
      mobileBrand.evaluate((image) => (image as HTMLImageElement).currentSrc),
      search.boundingBox(),
      topRowBrand.boundingBox(),
    ]);
    expect(decodeURIComponent(mobileBrandSource)).toMatch(
      /\/logo\.[^/]*\.svg(?:\?|$)/i,
    );
    expect(searchBox).not.toBeNull();
    expect(topRowBrandBox).not.toBeNull();
    expect(searchBox!.y).toBeGreaterThan(topRowBrandBox!.y);
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

test("cold mobile hydration stays stable and loads the compact logo", async ({
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

  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("site-header")).toBeVisible();
  await expect(page.getByTestId("site-header").locator("input")).toHaveCount(1);
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
    await page.getByTestId("header-brand").locator("img").evaluate(
      (image) => (image as HTMLImageElement).currentSrc,
    ),
  );

  expect(metrics.cls).toBeLessThanOrEqual(0.1);
  expect(currentLogoSource).toMatch(/\/logo\.[^/]*\.svg(?:\?|$)/i);
  expect(decodedRequests.some((url) => url.includes("logo-desktop"))).toBe(
    false,
  );
  expect(
    decodedRequests.some((url) => /\/logo\.[^/]*\.svg(?:\?|$)/i.test(url)),
  ).toBe(true);
  expect(
    decodedRequests.some((url) => /\/site\.[^/]*\.png(?:\?|$)/i.test(url)),
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

test("search keeps its node, value and focus across the md boundary", async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);

  await page.setViewportSize({ width: 899, height: 800 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });

  const search = page.getByTestId("site-header").locator("input");
  await expect(search).toHaveCount(1);
  await search.fill("x");
  await search.focus();
  await search.evaluate((element) => {
    (
      window as typeof window & {
        __responsiveSearchNode?: Element;
      }
    ).__responsiveSearchNode = element;
  });

  for (const width of [900, 899]) {
    await page.setViewportSize({ width, height: 800 });
    await waitForStableFrame(page);
    await expect(search).toHaveValue("x");
    await expect(search).toBeFocused();
    expect(
      await search.evaluate(
        (element) =>
          (
            window as typeof window & {
              __responsiveSearchNode?: Element;
            }
          ).__responsiveSearchNode === element,
      ),
    ).toBe(true);
  }

  expectCleanDiagnostics(diagnostics);
});

test("pending actions popover keeps its node across the md boundary", async ({
  page,
  baseURL,
}) => {
  const diagnostics = await installDiagnostics(page);

  await page.context().addCookies([
    {
      name: "access_token",
      value: "playwright-access-token",
      url: baseURL!,
    },
  ]);
  await page.route("**/order/seller", (route) =>
    void fulfillJson(route, [
      {
        actualStatus: "BOOKED",
        product: { imageId: 0 },
      },
    ]),
  );
  await page.route("**/order/customer", (route) =>
    void fulfillJson(route, []),
  );
  await page.route("**/products/my", (route) => void fulfillJson(route, []));
  await page.route("**/images/metadata?ids=*", (route) =>
    void fulfillJson(route, []),
  );

  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });

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
  await popover.evaluate((element) => {
    (
      window as typeof window & {
        __responsivePendingPopoverNode?: Element;
      }
    ).__responsivePendingPopoverNode = element;
  });

  for (const width of [899, 900]) {
    await page.setViewportSize({ width, height: 800 });
    await waitForStableFrame(page);
    await expect(profileLink).toBeFocused();
    await expect(popover).toBeVisible();
    expect(
      await popover.evaluate(
        (element) =>
          (
            window as typeof window & {
              __responsivePendingPopoverNode?: Element;
            }
          ).__responsivePendingPopoverNode === element,
      ),
    ).toBe(true);
  }

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

  await page.goto("/about", { waitUntil: "domcontentloaded" });

  for (const width of [320, 599, 600, 899, 900, 1375, 1376, 1535, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    await waitForStableFrame(page);
    await expect(page.getByTestId("site-header").locator("input")).toHaveCount(
      1,
    );
    await expectNoHorizontalOverflow(page);
  }

  const header = page.getByTestId("site-header");
  await page.evaluate(() => {
    document.body.style.minHeight = "2000px";
    window.scrollTo(0, 0);
  });
  await page.setViewportSize({ width: 600, height: 800 });
  await waitForStableFrame(page);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(100);
  await expect(header).not.toHaveAttribute("data-hidden", "true");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 599, height: 800 });
  await waitForStableFrame(page);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(header).toHaveAttribute("data-hidden", "true");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(header).not.toHaveAttribute("data-hidden", "true");

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
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Открыть категории" }).click();
  const categoriesDrawer = page.getByTestId("categories-drawer-content");
  await expect(categoriesDrawer).toBeVisible();
  await categoriesDrawer.getByRole("button", { name: "Фигурки" }).click();
  await expect(categoriesDrawer.getByText("Аниме", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 900, height: 800 });
  await waitForStableFrame(page);
  await expect(categoriesDrawer).toBeVisible();
  await expect(categoriesDrawer.getByText("Аниме", { exact: true })).toBeVisible();
  const headerBox = await page.getByTestId("site-header").boundingBox();
  const drawerBox = await categoriesDrawer.boundingBox();

  if (!headerBox || !drawerBox) {
    throw new Error("Header and categories drawer must have layout boxes");
  }

  expect(Math.abs(drawerBox.y - (headerBox.y + headerBox.height))).toBeLessThan(
    1,
  );
  await page.setViewportSize({ width: 899, height: 800 });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Открыть категории" }),
  ).toBeFocused();

  await page.setViewportSize({ width: 393, height: 727 });
  await mockCatalogApi(page);
  await page.goto("/catalog/search?query=fixture", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('a[href="/catalog/901/detail"]')).toBeVisible();
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
