import { expect, test } from "@playwright/test";
import { fulfillJson, image, setupMobileAccount } from "./helpers/mobileAccount";
import { setupAdmin } from "./helpers/admin";
import { setupSettingsAccount } from "./helpers/settingsAccount";

const detail = { id: 42, participantId: 1, name: "Исходный товар", description: "Описание", price: 1250.75, count: 2 as number | null, prepaymentAmount: 250.25, currency: "RUB", originality: "ORIGINAL", availability: "PREORDER", categories: [{ id: 2, name: "Аниме" }], imageIds: [77], reviews: [], status: "ACTIVE", externalUrl: null };

for (const count of [0, null, 5]) test(`description edit preserves stock ${count} and fractional money`, async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  const writes: Record<string, unknown>[] = [];
  await page.route("**/product/42", route => {
    if (route.request().method() === "PUT") { writes.push(route.request().postDataJSON()); return fulfillJson(route, null); }
    return fulfillJson(route, { ...detail, count });
  });
  await page.route("**/images/metadata?*", route => fulfillJson(route, [image]));
  await page.goto("/dashboard/products/42/edit");
  await expect(page.getByLabel("Количество", { exact: true })).toHaveValue(count === null ? "" : String(count));
  await page.getByLabel("Описание товара", { exact: true }).fill("Новое описание");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ count, price: 1250.75, prepaymentAmount: 250.25, description: "Новое описание" });
});

test("invalid money and stock show field errors without PUT", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  let writes = 0;
  await page.route("**/product/42", route => {
    if (route.request().method() === "PUT") writes++;
    return fulfillJson(route, detail);
  });
  await page.route("**/images/metadata?*", route => fulfillJson(route, [image]));
  await page.goto("/dashboard/products/42/edit");
  const save = page.getByRole("button", { name: "Сохранить изменения", exact: true });
  for (const label of ["Цена", "Предоплата", "Количество"]) {
    const field = page.locator(label === "Цена" ? "#price" : label === "Предоплата" ? "#prepaymentAmount" : "#count");
    for (const value of ["9".repeat(400), "NaN", "Infinity", "wrong"]) {
      await field.fill(value);
      await save.click();
      await expect(field).toHaveAttribute("aria-invalid", "true");
      expect(writes).toBe(0);
    }
    await field.fill(label === "Количество" ? "2" : "250.25");
    await field.blur();
  }
});

for (const scenario of ["pending", "missing", "mismatch", "temporary"] as const) test(`edit ${scenario} never exposes a blank form`, async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let writes = 0;
  await page.route("**/product/42", async route => {
    if (route.request().method() === "PUT") writes++;
    if (scenario === "pending") await gate;
    return fulfillJson(route, scenario === "mismatch" ? { ...detail, id: 43 } : scenario === "missing" || scenario === "temporary" ? { message: "Unavailable" } : detail, scenario === "missing" ? 404 : scenario === "temporary" ? 503 : 200);
  });
  await page.goto("/dashboard/products/42/edit");
  try {
    if (scenario === "pending") await expect(page.getByText("Загружаем товар для редактирования...")).toBeVisible();
    else if (scenario === "missing") await expect(page.getByText("Товар не найден", { exact: true })).toBeVisible();
    else await expect(page.getByRole("button", { name: "Повторить", exact: true })).toBeVisible();
    await expect(page.getByRole("form", { name: "Форма товара" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toHaveCount(0);
    expect(writes).toBe(0);
  } finally { release(); }
});

test("admin nullable prepayment displays no prepayment and saves numeric zero", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.products[0].prepaymentAmount = null;
  await page.goto("/admin/products/101");
  await expect(page.getByLabel("Предоплата", { exact: true })).toHaveValue("0");
  await expect(page.getByText("Без предоплаты", { exact: true })).toBeVisible();
  await page.getByLabel("Название", { exact: true }).fill("Новое название");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes[0].body).toMatchObject({ name: "Новое название", prepaymentAmount: 0 });
});

test("admin mismatched product cannot open write controls", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  await page.route("**/admin/actions/products/101", route => fulfillJson(route, { ...state.products[0], id: 102 }));
  await page.goto("/admin/products/101");
  await expect(page.getByText("Загруженный товар не соответствует ID страницы. Редактирование недоступно.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("invalid admin page and agent parameters never reach API", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  for (const value of ["bad", "-1", "1.5", "Infinity", "9007199254740992"]) {
    state.reads.length = 0;
    await page.goto(`/admin/orders?page=${value}&agent=${value}`);
    await expect(page.getByRole("button", { name: "Открыть заказ #201" })).toBeVisible();
    const reads = state.reads.filter(path => /agent-orders\?/.test(path));
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every(path => /agent-orders\?page=0&size=50/.test(path))).toBe(true);
    await page.goto(`/admin/products?page=${value}&agent=${value}`);
    await expect(page.getByText("Фигурка дракона 101", { exact: true })).toBeVisible();
    expect(state.reads.filter(path => path.startsWith("/admin/")).every(path => !path.includes(value))).toBe(true);
  }
});

test("shipping rejects non-finite price before writing and preserves fractions", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/settings?tab=shipping");
  const price = page.getByRole("textbox", { name: "Стоимость доставки" });
  await expect(price).toBeVisible();
  for (const value of ["9".repeat(400), "NaN", "Infinity"]) {
    await price.fill(value);
    await price.blur();
    await expect(price).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("button", { name: "Сохранить", exact: true })).toBeDisabled();
    expect(state.writes).toEqual([]);
  }
  await price.fill("650.25");
  await price.blur();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].body.price).toBe(650.25);
});

test("price filter keeps invalid input out of requests and applies fractional bounds", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 393, height: 727 });
  await setupMobileAccount(page, baseURL);
  const searches: Record<string, unknown>[] = [];
  await page.route("**/products/find", route => { searches.push(route.request().postDataJSON()); return fulfillJson(route, []); });
  await page.goto("/catalog/search");
  await page.getByTestId("price-range-trigger").click();
  const min = page.getByRole("textbox", { name: "От", exact: true });
  const max = page.getByRole("textbox", { name: "До", exact: true });
  const apply = page.getByRole("button", { name: "Готово", exact: true });
  for (const value of ["9".repeat(400), "NaN", "Infinity"]) {
    await min.fill(value);
    await expect(min).toHaveAttribute("aria-invalid", "true");
    const before = searches.length;
    await apply.click();
    await expect(min).toBeVisible();
    expect(searches.length).toBe(before);
  }
  await min.fill("1250.75");
  await max.fill("2250.25");
  await apply.click();
  await expect.poll(() => searches.some(body => JSON.stringify(body).includes("1250.75") && JSON.stringify(body).includes("2250.25"))).toBe(true);
});
