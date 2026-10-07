import { expect, test, type Page } from "@playwright/test";
import { fulfillJson, image, png, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);
const key = "create-product-form-draft";
const values = { categoryIds: [2], name: "Тестовая фигурка", price: "1250", currency: "RUB", description: "Комплектация", availability: "PURCHASABLE", prepaymentAmount: "", count: "2", originality: "ORIGINAL", externalUrl: "" };
const file = { name: "photo.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") };
const seed = (page: Page) => page.addInitScript(({ key, values }) => localStorage.setItem(key, JSON.stringify({ owner: 1, values, imageIds: [77] })), { key, values });
const savedIds = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}").imageIds, key);
const clear = async (page: Page) => {
  await page.getByRole("button", { name: "Очистить форму", exact: true }).click();
};
const trackBlobs = (page: Page) => page.addInitScript(() => {
  const created: string[] = [], revoked: string[] = [];
  Object.assign(window, { blobTracking: { created, revoked } });
  const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = blob => { const url = create(blob); created.push(url); return url; };
  URL.revokeObjectURL = url => { revoked.push(url); revoke(url); };
});
const blobs = (page: Page) => page.evaluate(() => (window as unknown as { blobTracking: { created: string[]; revoked: string[] } }).blobTracking);

for (const removed of [1, 3]) {
  test(`partial first/middle metadata preserves IDs; only explicit image ${removed} is deleted`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    const writes: { imageIds: number[] }[] = [], deletes: string[][] = [];
    await page.route("**/product/42", route => {
      if (route.request().method() === "PUT") {
        writes.push(route.request().postDataJSON());
        return fulfillJson(route, null);
      }
      return fulfillJson(route, { ...values, id: 42, sellerId: 1, price: 1250, count: 2, prepaymentAmount: 0, categories: [{ id: 2, name: "Аниме" }], imageIds: [11, 22, 33] });
    });
    await page.route("**/images/metadata?*", route => fulfillJson(route, [{ ...image, id: 33 }]));
    await page.route("**/images?*", route => {
      if (route.request().method() === "DELETE") deletes.push(new URL(route.request().url()).searchParams.getAll("ids"));
      return fulfillJson(route, null);
    });
    await page.goto("/dashboard/products/42/edit");
    await expect(page.getByText("Фото #11: предпросмотр недоступен. Фото сохранено.")).toBeVisible();
    await expect(page.getByText("Фото #22: предпросмотр недоступен. Фото сохранено.")).toBeVisible();
    await expect(page.getByRole("img", { name: "Изображение 3", exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Удалить изображение ${removed}`, exact: true }).click();
    await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
    await expect.poll(() => writes.map(write => write.imageIds)).toEqual([removed === 1 ? [22, 33] : [11, 22]]);
    await expect.poll(() => deletes).toEqual([[removed === 1 ? "11" : "33"]]);
  });
}

test("failed restore blocks upload, retains IDs and allows retry", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.imagesStatus = 500;
  await seed(page);
  await page.goto("/dashboard/products/new");
  await expect(page.getByText(/Не удалось восстановить фото черновика/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Добавить фото", exact: true })).toBeDisabled();
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  await page.getByRole("textbox", { name: "Название товара" }).fill("Сохранённый ввод");
  await expect.poll(() => savedIds(page)).toEqual([77]);
  state.imagesStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).first().click();
  await expect(page.getByRole("img", { name: "Изображение 1", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("Сохранённый ввод");
  await expect(page.getByRole("button", { name: "Добавить фото", exact: true })).toBeEnabled();
});

test("clear invalidates delayed restore before uploading a new set", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  await seed(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let reads = 0;
  await page.route("**/images/metadata?*", async route => { reads++; await gate; await fulfillJson(route, [image]); });
  await page.route("**/images?tag=PRODUCT", route => fulfillJson(route, [88]));
  try {
    await page.goto("/dashboard/products/new");
    await expect.poll(() => reads).toBe(1);
    await expect(page.getByRole("button", { name: "Добавить фото", exact: true })).toBeDisabled();
    await clear(page);
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect.poll(() => savedIds(page)).toEqual([88]);
    const restored = page.waitForResponse(response => response.url().includes("/images/metadata?"));
    release();
    await (await restored).finished();
    await expect(page.getByRole("button", { name: "Добавить фото", exact: true })).toBeEnabled();
    await page.getByRole("textbox", { name: "Название товара" }).fill("Новый набор");
    await expect.poll(() => savedIds(page)).toEqual([88]);
    await expect(page.getByRole("img", { name: "Изображение 1", exact: true })).toHaveAttribute("src", /^blob:/);
  } finally { release(); }
});

test("invalid product upload has error, no payload and can be replaced with valid upload", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  await seed(page);
  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("img", { name: "Изображение 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Удалить изображение 1", exact: true }).click();
  for (const response of [[], [null], [0], [-1], ["77"], [1.5]]) {
    await page.route("**/images?tag=PRODUCT", route => fulfillJson(route, response));
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByText("Не удалось загрузить изображение", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Опубликовать товар", exact: true })).toBeDisabled();
    await expect.poll(() => savedIds(page)).toEqual([]);
    expect(state.writes).toEqual([]);
    await page.getByRole("button", { name: "Удалить изображение 1", exact: true }).click();
  }
  await page.route("**/images?tag=PRODUCT", route => fulfillJson(route, [88]));
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByRole("button", { name: "Опубликовать товар", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Опубликовать товар", exact: true }).click();
  await expect.poll(() => state.writes.map(write => write.imageIds)).toEqual([[88]]);
});

test("create draft owns successful blobs across unmount and releases them on clear without DELETE", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  await trackBlobs(page);
  const deletes: string[] = [];
  page.on("request", request => { if (request.method() === "DELETE") deletes.push(request.url()); });
  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("button", { name: "Добавить фото", exact: true })).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect.poll(() => savedIds(page)).toEqual([77]);
  const { created } = await blobs(page);
  await page.getByRole("link", { name: "Мои товары", exact: true }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await page.goBack();
  await expect(page.getByRole("img", { name: "Изображение 1", exact: true })).toHaveAttribute("src", created[0]);
  expect((await blobs(page)).revoked).not.toContain(created[0]);
  await clear(page);
  expect((await blobs(page)).revoked).toContain(created[0]);
  expect(deletes).toEqual([]);
});

test("edit unmount releases successful blobs without deleting server images", async ({ page, baseURL }) => {
  page.on("dialog", dialog => dialog.accept());
  await setupMobileAccount(page, baseURL);
  await trackBlobs(page);
  const deletes: string[] = [];
  page.on("request", request => { if (request.method() === "DELETE") deletes.push(request.url()); });
  await page.route("**/product/42", route => fulfillJson(route, { ...values, id: 42, sellerId: 1, price: 1250, count: 2, prepaymentAmount: 0, categories: [{ id: 2, name: "Аниме" }], imageIds: [] }));
  await page.goto("/dashboard/products/42/edit");
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByRole("button", { name: "Удалить изображение 1", exact: true })).toBeEnabled();
  const { created } = await blobs(page);
  expect(created).toHaveLength(1);
  await page.getByRole("link", { name: "Мои товары", exact: true }).first().click();
  await expect.poll(async () => (await blobs(page)).revoked).toContain(created[0]);
  expect(deletes).toEqual([]);
});
