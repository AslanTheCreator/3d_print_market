import { expect, type Page, test } from "@playwright/test";

const fixtureAvailable =
  !process.env.TEST_BASE_URL ||
  Boolean(process.env.PLAYWRIGHT_FIXTURE_API_URL);

const expectNoNestedButtons = async (page: Page) => {
  await expect(page.locator("button button")).toHaveCount(0);
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
  const openFullscreen = gallery.getByRole("button", {
    name: "Открыть полноэкранную галерею",
  });

  await expect(openFullscreen).toBeVisible({ timeout: 15_000 });
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
