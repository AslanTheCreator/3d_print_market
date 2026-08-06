import { expect, type Locator, test } from "@playwright/test";

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

test("mobile gallery controls and fullscreen indicators meet the 44px policy", async ({
  page,
}) => {
  test.skip(!fixtureAvailable, "Product fixture is not configured");

  await page.goto("/catalog/901/detail", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("load");
  await page.waitForTimeout(1000);

  const gallery = page.getByTestId("product-gallery");
  const openFullscreen = gallery.getByRole("button", {
    name: "Открыть полноэкранную галерею",
  });
  const previous = gallery.getByRole("button", {
    name: "Предыдущее изображение",
  });
  const next = gallery.getByRole("button", {
    name: "Следующее изображение",
  });

  await expect(openFullscreen).toBeVisible({ timeout: 15_000 });
  await expectMinimumTouchTarget(openFullscreen);
  await expectMinimumTouchTarget(previous);
  await expectMinimumTouchTarget(next);

  await openFullscreen.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const fullscreenNext = dialog.getByRole("button", {
    name: "Следующее изображение",
  });
  const fullscreenPrevious = dialog.getByRole("button", {
    name: "Предыдущее изображение",
  });
  const firstIndicator = dialog.getByRole("button", {
    name: "Показать изображение 1 из 2",
  });
  const secondIndicator = dialog.getByRole("button", {
    name: "Показать изображение 2 из 2",
  });
  const close = dialog.getByRole("button", {
    name: "Закрыть полноэкранную галерею",
  });

  await expectMinimumTouchTarget(fullscreenPrevious);
  await expectMinimumTouchTarget(fullscreenNext);
  await expectMinimumTouchTarget(firstIndicator);
  await expectMinimumTouchTarget(secondIndicator);
  await expectMinimumTouchTarget(close);

  await fullscreenNext.focus();
  await page.keyboard.press("Space");
  await expect(dialog.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(secondIndicator).toHaveAttribute("aria-current", "true");
});
