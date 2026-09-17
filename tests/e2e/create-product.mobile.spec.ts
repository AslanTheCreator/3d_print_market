import { expect, type Page, test } from "@playwright/test";
import { expectNoOverflow, png, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);
const draftKey = "create-product-form-draft";
const formValues = { categoryIds: [2], name: "Тестовая фигурка", price: "1250", currency: "RUB", description: "Комплектация", availability: "PURCHASABLE", prepaymentAmount: "", count: "2", originality: "ORIGINAL", externalUrl: "" };
const seedDraft = async (page: Page, values = formValues) => page.addInitScript(({ key, values }) => {
  if (!sessionStorage.getItem("draft-seeded")) {
    localStorage.setItem(key, JSON.stringify({ values, imageIds: [77] }));
    sessionStorage.setItem("draft-seeded", "yes");
  }
}, { key: draftKey, values });
const publish = (page: Page) => page.getByRole("button", { name: "Опубликовать товар", exact: true });
const categoryTrigger = (page: Page) => page.locator("#product-categories-mobile");

test("create form preserves values across widths and category search commits only on Done", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("heading", { name: "Создать товар", exact: true })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeHidden();
  await page.getByRole("textbox", { name: "Название товара" }).fill("Черновик фигурки");
  await expect(page.getByTestId("product-draft-status")).toHaveText("Черновик сохранён в этом браузере");
  await categoryTrigger(page).click();
  const dialog = page.getByRole("dialog", { name: "Категории товара" });
  await expect(dialog).toBeVisible();
  expect((await dialog.boundingBox())!.width).toBe(393);
  await dialog.getByRole("textbox", { name: "Поиск категорий" }).fill("Аниме");
  await expect(dialog.getByRole("checkbox")).toHaveCount(1);
  await dialog.getByRole("checkbox", { name: "Аниме", exact: true }).check();
  await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(categoryTrigger(page)).not.toContainText("Аниме");
  await categoryTrigger(page).click();
  await dialog.getByRole("checkbox", { name: "Фигурки", exact: true }).check();
  await dialog.getByRole("checkbox", { name: "Аниме", exact: true }).check();
  await dialog.getByRole("button", { name: "Готово" }).click();
  await expect(categoryTrigger(page)).toContainText("Фигурки, Аниме");
  for (const width of [320, 393, 599, 600, 768, 899, 900, 393]) {
    await page.setViewportSize({ width, height: 727 });
    await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("Черновик фигурки");
    await expectNoOverflow(page);
    await expect(page.getByTestId("product-publish-bar")).toHaveCSS("position", width < 900 ? "fixed" : "static");
    if (width < 900) {
      const price = await page.getByRole("textbox", { name: "Цена", exact: true }).boundingBox();
      const currency = await page.getByRole("combobox", { name: "Валюта" }).boundingBox();
      expect(Math.abs(price!.y - currency!.y)).toBeLessThan(3);
    }
  }
  await page.getByRole("button", { name: /Что осталось заполнить/ }).click();
  await page.getByRole("button", { name: "Указать цену", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Цена", exact: true })).toBeFocused();
  const input = await page.getByRole("textbox", { name: "Цена", exact: true }).boundingBox();
  const bar = await page.getByTestId("product-publish-bar").boundingBox();
  expect(input!.y + input!.height).toBeLessThanOrEqual(bar!.y);
  await page.getByRole("button", { name: "Очистить форму", exact: true }).scrollIntoViewIfNeeded();
  const clearBounds = await page.getByRole("button", { name: "Очистить форму", exact: true }).boundingBox();
  expect(clearBounds!.y + clearBounds!.height).toBeLessThanOrEqual(bar!.y);
});

test("draft restores images and clear requires confirmation without losing data on cancel", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  await seedDraft(page);
  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue(formValues.name);
  await expect(page.getByRole("img", { name: "Изображение 1", exact: true })).toBeVisible();
  await expect(publish(page)).toBeEnabled();
  await page.getByRole("button", { name: "Очистить форму", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Очистить форму?" });
  await expect(dialog.getByRole("button", { name: "Отмена" })).toBeFocused();
  await dialog.getByRole("button", { name: "Отмена" }).click();
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue(formValues.name);
  await page.reload();
  await expect(publish(page)).toBeEnabled();
  await page.getByRole("button", { name: "Очистить форму", exact: true }).click();
  await dialog.getByRole("button", { name: "Очистить", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("");
  await expect(page.getByRole("img", { name: "Изображение 1", exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
});

test("failed draft image restoration is retryable and keeps text and photo IDs", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.imagesStatus = 500;
  await seedDraft(page);
  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("alert").filter({ hasText: "Не удалось восстановить фото" })).toBeVisible();
  await expect(publish(page)).toBeDisabled();
  await page.getByRole("textbox", { name: "Название товара" }).fill("Изменённый черновик");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).imageIds, draftKey)).toEqual([77]);
  state.imagesStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("img", { name: "Изображение 1", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("Изменённый черновик");
  await expect(publish(page)).toBeEnabled();
});

test("storage failure is described honestly and categories can be retried", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.categoriesStatus = 500;
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "create-product-form-draft") throw new DOMException("Storage denied", "QuotaExceededError");
      return setItem.call(this, key, value);
    };
  });
  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("heading", { name: "Не удалось загрузить категории" })).toBeVisible({ timeout: 20_000 });
  state.categoriesStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await page.getByRole("textbox", { name: "Название товара" }).fill("Локальный черновик");
  await expect(page.getByTestId("product-draft-status")).toContainText("только в памяти вкладки");
  await expectNoOverflow(page);
});

for (const availability of ["PURCHASABLE", "PREORDER"]) {
  test(`publishes ${availability} through mock API and retains data on a failed request`, async ({ page, baseURL }) => {
    const state = await setupMobileAccount(page, baseURL);
    state.createStatus = 500;
    await seedDraft(page, { ...formValues, availability, prepaymentAmount: "" });
    await page.goto("/dashboard/products/new");
    await expect(publish(page)).toBeEnabled();
    if (availability === "PREORDER") {
      await page.getByRole("button", { name: /Что осталось заполнить/ }).click();
      await page.getByRole("button", { name: "Указать предоплату", exact: true }).click();
      await expect(page.locator("#prepaymentAmount")).toBeFocused();
      await page.locator("#prepaymentAmount").fill("250");
    }
    await publish(page).click();
    await expect.poll(() => state.writes.length).toBe(1);
    await expect(publish(page)).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue(formValues.name);
    const alert = await page.getByRole("alert").filter({ hasText: /./ }).last().boundingBox();
    const bar = await page.getByTestId("product-publish-bar").boundingBox();
    expect(alert!.y + alert!.height).toBeLessThanOrEqual(bar!.y);
    expect(state.writes[0]).toEqual({ ...formValues, availability, price: 1250, count: 2, imageIds: [77], prepaymentAmount: availability === "PREORDER" ? 250 : 0 });
    state.createStatus = 200;
    await publish(page).click();
    await expect.poll(() => state.writes.length).toBe(2);
    await expect(page.getByText("Товар успешно создан!", { exact: true })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
    await expect(page).toHaveURL(/\/dashboard\/products$/);
  });
}

test("photo upload uses existing API and exposes a separate 44px remove button", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  await page.goto("/dashboard/products/new");
  await page.locator('form input[type="file"]').setInputFiles({ name: "figure.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  const remove = page.getByRole("button", { name: "Удалить изображение 1", exact: true });
  await expect(remove).toBeEnabled();
  const bounds = await remove.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(remove).toHaveCount(0);
});
