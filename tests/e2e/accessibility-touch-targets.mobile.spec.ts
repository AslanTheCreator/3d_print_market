import { expect, type Locator, type Page, test } from "@playwright/test";

const fixtureAvailable =
  !process.env.TEST_BASE_URL ||
  Boolean(process.env.PLAYWRIGHT_FIXTURE_API_URL);

const expectMinimumTouchTarget = async (locator: Locator) => {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
};

const expectSizeCloseTo = async (
  locator: Locator,
  expectedWidth: number | undefined,
  expectedHeight: number,
) => {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  if (expectedWidth !== undefined) {
    expect(Math.abs(box!.width - expectedWidth)).toBeLessThanOrEqual(0.5);
  }
  expect(Math.abs(box!.height - expectedHeight)).toBeLessThanOrEqual(0.5);
};

const swipeHorizontally = async (
  page: Page,
  locator: Locator,
  deltaX: number,
) => {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error("Swipe target must have a layout box");
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const session = await page.context().newCDPSession(page);

  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    });
    for (let step = 1; step <= 4; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + (deltaX * step) / 4, y: startY }],
      });
      await page.waitForTimeout(16);
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
};

test("mobile header preserves its visual geometry while exposing 44px hit areas", async ({
  page,
}) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });

  const header = page.getByTestId("site-header");
  const searchForm = header.locator("form").first();
  const search = header.getByRole("textbox", { name: "поиск по сайту" });
  const categoryButton = header.getByRole("button", {
    name: "Открыть категории",
  });
  const categoryVisual = categoryButton.locator(
    ".HeaderCategoryButton-visual",
  );

  await expectSizeCloseTo(header, undefined, 119);
  await expectSizeCloseTo(searchForm, undefined, 35);
  await expectSizeCloseTo(categoryVisual, 33, 33);

  await expectMinimumTouchTarget(categoryButton);
  await expectMinimumTouchTarget(search);
  await expectMinimumTouchTarget(
    header.getByRole("link", { name: "Избранное" }),
  );
  await expectMinimumTouchTarget(
    header.getByRole("link", { name: "Профиль" }),
  );
  await expectMinimumTouchTarget(
    header.getByRole("link", { name: "Корзина" }),
  );
});

test("mobile gallery hides arrow controls and keeps fullscreen targets accessible", async ({
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
  const previous = gallery.locator(
    'button[aria-label="Предыдущее изображение"]',
  );
  const next = gallery.locator('button[aria-label="Следующее изображение"]');

  await expect(openFullscreen).toBeVisible({ timeout: 15_000 });
  await expectMinimumTouchTarget(openFullscreen);
  await expect(previous).toBeHidden();
  await expect(next).toBeHidden();

  const thumbnails = gallery.locator("button[aria-pressed]");
  const firstThumbnail = thumbnails.nth(0);
  const secondThumbnail = thumbnails.nth(1);

  await swipeHorizontally(page, openFullscreen, -120);
  await expect(secondThumbnail).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await swipeHorizontally(page, openFullscreen, 120);
  await expect(firstThumbnail).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await openFullscreen.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const fullscreenNext = dialog.locator(
    'button[aria-label="Следующее изображение"]',
  );
  const fullscreenPrevious = dialog.locator(
    'button[aria-label="Предыдущее изображение"]',
  );
  const firstIndicator = dialog.getByRole("button", {
    name: "Показать изображение 1 из 2",
  });
  const secondIndicator = dialog.getByRole("button", {
    name: "Показать изображение 2 из 2",
  });
  const close = dialog.getByRole("button", {
    name: "Закрыть полноэкранную галерею",
  });
  const imageStage = dialog.getByTestId("fullscreen-image-stage");

  await expect(fullscreenPrevious).toBeHidden();
  await expect(fullscreenNext).toBeHidden();
  await expectMinimumTouchTarget(firstIndicator);
  await expectMinimumTouchTarget(secondIndicator);
  await expectMinimumTouchTarget(close);

  await swipeHorizontally(page, imageStage, -120);
  await expect(dialog.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(secondIndicator).toHaveAttribute("aria-current", "true");

  await swipeHorizontally(page, imageStage, 120);
  await expect(dialog.getByText("1 / 2", { exact: true })).toBeVisible();
  await expect(firstIndicator).toHaveAttribute("aria-current", "true");
});
