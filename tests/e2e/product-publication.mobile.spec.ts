import { expect, test, type Page } from "@playwright/test";
import { fulfillJson, image, setupMobileAccount } from "./helpers/mobileAccount";

const draftKey = "create-product-form-draft";
const values = { categoryIds: [2], name: "Отправленный товар", price: "1250.75", currency: "RUB", description: "Описание", availability: "PREORDER", prepaymentAmount: "250.25", count: "2", originality: "ORIGINAL", externalUrl: "" };
const detail = { ...values, id: 42, participantId: 1, categories: [{ id: 2, name: "Аниме" }], count: 2, price: 1250.75, prepaymentAmount: 250.25, imageIds: [77, 88], reviews: [], status: "ACTIVE" };
const seed = (page: Page) => page.addInitScript(({ key, values }) => {
  if (!sessionStorage.getItem("publication-seed")) {
    localStorage.setItem(key, JSON.stringify({ owner: 1, values, imageIds: [77, 88] }));
    sessionStorage.setItem("publication-seed", "yes");
  }
}, { key: draftKey, values });
const submitTwice = (page: Page) => page.getByRole("form", { name: "Форма товара" }).evaluate(form => {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
});

for (const edit of [false, true]) test(`${edit ? "edit" : "create"} locks fields, categories, photos and reset; failure permits corrected retry`, async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  if (!edit) await seed(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let status = 500, saved = { ...detail };
  const writes: Record<string, unknown>[] = [];
  await page.route("**/images/metadata?*", route => fulfillJson(route, [77, 88].map(id => ({ ...image, id }))));
  await page.route(edit ? "**/product/42" : "**/products", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (route.request().method() === "GET") return fulfillJson(route, saved);
    writes.push(route.request().postDataJSON());
    await gate;
    if (status === 200) saved = { ...saved, ...writes.at(-1) };
    return fulfillJson(route, status === 200 ? null : { message: "Отказ записи" }, status);
  });
  await page.goto(edit ? "/dashboard/products/42/edit" : "/dashboard/products/new");
  const name = page.getByRole("textbox", { name: "Название товара" });
  await name.fill("Snapshot товара");
  const form = page.getByRole("form", { name: "Форма товара" });
  try {
    await submitTwice(page);
    await expect.poll(() => writes.length).toBe(1);
    await expect(form).toHaveAttribute("aria-busy", "true");
    for (const control of await form.locator('input:not([type="hidden"]), textarea, button').all()) await expect(control).toBeDisabled();
    await expect(page.getByRole("button", { name: "Удалить изображение 1", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Добавить фото", exact: true })).toBeDisabled();
    await page.setViewportSize({ width: 1376, height: 900 });
    for (const control of await form.getByRole("combobox").all()) await expect(control).toHaveAttribute("aria-disabled", "true");
    await submitTwice(page);
    await page.keyboard.press("Enter");
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ name: "Snapshot товара", price: 1250.75, prepaymentAmount: 250.25, categoryIds: [2], imageIds: [77, 88] });
    release();
    await expect(name).toBeEnabled();
    await expect(name).toHaveValue("Snapshot товара");
    status = 200;
    await name.fill("Исправленный товар");
    await page.getByRole("button", { name: edit ? "Сохранить изменения" : "Опубликовать товар", exact: true }).click();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes[1].name).toBe("Исправленный товар");
    await expect(page).toHaveURL(/\/dashboard\/products$/);
  } finally { release(); }
});

test("edit confirms field and image baseline before pending cleanup", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  let saved = { ...detail }, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const writes: Record<string, unknown>[] = [];
  await page.route("**/product/42", route => {
    if (route.request().method() === "PUT") { const body = route.request().postDataJSON(); writes.push(body); saved = { ...saved, ...body }; return fulfillJson(route, null); }
    return fulfillJson(route, saved);
  });
  await page.route("**/images/metadata?*", route => fulfillJson(route, [77, 88].map(id => ({ ...image, id }))));
  await page.route("**/images?*", async route => { await gate; return fulfillJson(route, { message: "Cleanup failed" }, 500); });
  await page.goto("/dashboard/products/42/edit");
  await page.getByRole("textbox", { name: "Название товара" }).fill("Подтверждённый snapshot");
  await page.getByRole("button", { name: "Удалить изображение 1", exact: true }).click();
  const form = page.getByRole("form", { name: "Форма товара" });
  await expect(form).toHaveAttribute("data-dirty", "true");
  try {
    await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
    await expect(form).toHaveAttribute("data-dirty", "false");
    await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("Подтверждённый snapshot");
    await expect(page.getByRole("textbox", { name: "Название товара" })).toBeDisabled();
    release();
    await expect(page.getByText("Товар сохранён, очистка изображений не завершена.")).toBeVisible();
    await submitTwice(page);
    expect(writes).toHaveLength(1);
    expect(writes[0].imageIds).toEqual([88]);
  } finally { release(); }
});

for (const delayed of [false, true]) test(`old create ${delayed ? "success" : "redirect timer"} cannot clear a new instance or navigate away`, async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  await seed(page);
  const clockTime = new Date("2026-10-06T12:00:00Z");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let writes = 0;
  await page.route("**/products", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++;
    if (delayed) await gate;
    return fulfillJson(route, null);
  });
  await page.goto("/dashboard/products/new");
  await page.setViewportSize({ width: 1376, height: 900 });
  await expect(page.getByRole("button", { name: "Опубликовать товар", exact: true })).toBeEnabled();
  await page.clock.install({ time: clockTime });
  await page.clock.pauseAt(clockTime);
  const response = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/products");
  await page.getByRole("button", { name: "Опубликовать товар", exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  if (!delayed) await expect(page.getByText("Товар создан. Переходим к списку товаров.")).toBeVisible();
  try {
    await page.locator('a[href="/"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.clock.resume();
    await page.getByRole("link", { name: "Профиль", exact: true }).first().click();
    await page.getByRole("link", { name: "Мои товары", exact: true }).first().click();
    await page.getByRole("button", { name: "Создать товар", exact: true }).first().click();
    const name = page.getByRole("textbox", { name: "Название товара" });
    await name.fill("Черновик нового экземпляра");
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).values.name, draftKey)).toBe("Черновик нового экземпляра");
    release();
    await response;
    await page.clock.runFor(2500);
    await expect(page).toHaveURL(/\/dashboard\/products\/new$/);
    await expect(name).toHaveValue("Черновик нового экземпляра");
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).values.name, draftKey)).toBe("Черновик нового экземпляра");
    expect(writes).toBe(1);
  } finally { release(); }
});
