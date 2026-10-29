import { expect, test, type Page } from "@playwright/test";
import { deferred } from "./helpers/adminGiveaway";
import { createGiveawayValues, fillGiveawayCreation, giveawayImageFile, setupGiveawayCreation } from "./helpers/adminGiveawayCreate";
import { expectNoOverflow, fulfillJson, setupMobileAccount } from "./helpers/mobileAccount";

const submit = (page: Page) => page.getByRole("button", { name: "Создать розыгрыш", exact: true });
const name = (page: Page) => page.getByRole("textbox", { name: "Название приза", exact: true });
const recover = (page: Page) => page.getByRole("button", { name: "Обновить данные после создания", exact: true });
const reconnect = (page: Page) => page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
const open = async (page: Page) => { await page.goto("/admin/giveaways/new"); await expect(submit(page)).toBeEnabled(); };

test("seller draft cannot restore GIVEAWAY or submit an administrative payload", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  await page.addInitScript(() => localStorage.setItem("create-product-form-draft", JSON.stringify({
    owner: 1, imageIds: [77], values: {
      categoryIds: [2], name: "Черновик продавца", price: "1250", currency: "RUB", description: "Комплектация",
      availability: "GIVEAWAY", prepaymentAmount: "", count: "2", originality: "ORIGINAL", externalUrl: "",
    },
  })));
  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("textbox", { name: "Название товара", exact: true })).toHaveValue("Черновик продавца");
  await expect(page.getByRole("button", { name: "В наличии", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Розыгрыш/ })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Telegram-ссылка", exact: true })).toHaveCount(0);
  const publish = page.getByRole("button", { name: "Опубликовать товар", exact: true });
  await expect(publish).toBeEnabled(); await publish.click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toMatchObject({ availability: "PURCHASABLE", name: "Черновик продавца", price: 1250 });
  expect(state.writes[0]).not.toHaveProperty("giveaway");
});

test("ADMIN creates own prize with exact B3 body and no seller prerequisites, then public details and own list agree", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL);
  await page.goto("/dashboard/products"); await expect.poll(() => state.ownReads).toBeGreaterThan(0);
  await page.goto("/admin/giveaways"); await page.getByRole("link", { name: "Создать розыгрыш", exact: true }).click(); await expect(submit(page)).toBeEnabled();
  await fillGiveawayCreation(page); await submit(page).click();
  await expect(page).toHaveURL(/\/admin\/giveaways$/); await expect(page.getByText("Розыгрыш создан. История и связанные данные обновлены.")).toBeVisible();
  expect(state.creates).toEqual([{ availability: "GIVEAWAY", name: createGiveawayValues.name, description: createGiveawayValues.description, currency: "RUB", categoryIds: [], imageIds: [], giveaway: {
    enabled: true, telegramUrl: createGiveawayValues.telegramUrl, startAt: "2027-06-01T12:00:00.000Z", endAt: "2027-06-02T12:00:00.000Z", winnersCount: 2, rules: createGiveawayValues.rules, homeText: createGiveawayValues.homeText,
  } }]);
  expect(state.api.products[0].participantId).toBe(1);
  expect(state.api.admin.reads.filter(path => /accounts|social-networks|transfers/.test(path))).toEqual([]);
  expect(state.api.admin.writes).toEqual([]);
  await page.goto("/giveaways/9001"); await expect(page.getByRole("heading", { name: "Новый приз", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Участвовать в Telegram", exact: true })).toHaveAttribute("href", createGiveawayValues.telegramUrl);
  await page.goto("/dashboard/products"); await expect(page.getByText("Новый приз", { exact: true })).toBeVisible(); expect(state.ownReads).toBeGreaterThan(1);
  await expect(page.getByRole("button", { name: "Купить", exact: true })).toHaveCount(0); expect(state.creates).toHaveLength(1);
});

test("ordinary user cannot mount creation or write", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL, "USER"); await page.goto("/admin/giveaways/new");
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible(); await expect(name(page)).toHaveCount(0);
  expect(state.creates).toEqual([]); expect(state.api.reads).toEqual([]);
});

test("validation retains input and never sends invalid B3, without sale price/count fields", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await open(page); await submit(page).click();
  await expect(page.getByText("Введите название приза")).toBeVisible(); await expect(page.getByText("Введите описание приза")).toBeVisible();
  await fillGiveawayCreation(page);
  await page.getByRole("textbox", { name: "Telegram-ссылка", exact: true }).fill("https://t.me/");
  await page.getByRole("spinbutton", { name: "Число победителей" }).fill("1.5"); await submit(page).click();
  await expect(page.getByText(/Укажите HTTPS-ссылку/)).toBeVisible(); await expect(page.getByText("Введите положительное целое число")).toBeVisible();
  await expect(name(page)).toHaveValue("Новый приз"); expect(state.creates).toEqual([]);
  for (const label of ["Цена продажи", "Остаток", "Предоплата", "Внешняя ссылка"]) await expect(page.getByLabel(label, { exact: true })).toHaveCount(0);
});

test("PRODUCT upload error retains form/file, explicit retry sends returned IDs and optional categories/currency", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await open(page); await fillGiveawayCreation(page);
  state.uploadStatus = 500; await page.locator('input[type="file"]').setInputFiles(giveawayImageFile);
  await expect(page.getByText("Изображение не загружено", { exact: true })).toBeVisible(); await expect(submit(page)).toBeDisabled(); await expect(name(page)).toHaveValue("Новый приз");
  state.uploadStatus = 200; await page.getByRole("button", { name: "Повторить загрузку изображения", exact: true }).click();
  await expect(page.getByRole("button", { name: "Убрать фото #77" })).toBeVisible();
  await page.getByRole("combobox", { name: /^Валюта / }).click(); await page.getByRole("option", { name: /USD/ }).click();
  await page.getByRole("combobox", { name: "Категории (необязательно)", exact: true }).click(); await page.getByRole("option", { name: "Фигурки", exact: true }).click(); await page.keyboard.press("Escape");
  await submit(page).click(); await expect(page).toHaveURL(/\/admin\/giveaways$/);
  expect(state.creates[0]).toMatchObject({ currency: "USD", categoryIds: [1], imageIds: [77] }); expect(state.uploads).toEqual(["?tag=PRODUCT", "?tag=PRODUCT"]);
});

for (const code of ["GIVEAWAY_WINDOW_OVERLAP", "INVALID_REQUEST"]) test(`server 400 ${code} allows only explicit corrected retry and preserves fields`, async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await open(page); await fillGiveawayCreation(page); state.status = 400; state.code = code;
  await submit(page).click(); await expect(page.getByText("Создание отклонено сервером", { exact: true })).toBeVisible(); await expect(name(page)).toHaveValue("Новый приз");
  const start = page.getByRole("textbox", { name: "Начало (ISO 8601)", exact: true });
  await expect(start).toHaveAttribute("aria-invalid", code === "GIVEAWAY_WINDOW_OVERLAP" ? "true" : "false"); expect(state.creates).toHaveLength(1);
  state.status = 200; await submit(page).click(); await expect(page).toHaveURL(/\/admin\/giveaways$/); expect(state.creates).toHaveLength(2);
});

test("accepted POST + failed history GET retains receipt and retries only GET through remount", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await open(page); await fillGiveawayCreation(page); state.failHistory = true;
  await submit(page).click(); await expect(page.getByText(/Розыгрыш создан, но связанные данные не обновлены/)).toBeVisible(); await expect(submit(page)).toBeDisabled();
  state.api.admin.role = "USER"; await reconnect(page); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  state.api.admin.role = "ADMIN"; await reconnect(page); await expect(name(page)).toHaveValue("Новый приз"); await expect(submit(page)).toBeDisabled();
  state.api.historyStatus = 200; await recover(page).click(); await expect(page).toHaveURL(/\/admin\/giveaways$/); expect(state.creates).toHaveLength(1);
  await page.getByRole("link", { name: "Создать розыгрыш", exact: true }).click(); await expect(name(page)).toHaveValue(""); await expect(submit(page)).toBeEnabled(); expect(state.creates).toHaveLength(1);
});

for (const applied of [true, false]) test(`unknown POST applied=${applied} survives history/form navigation and matching name never unlocks POST`, async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await open(page); await fillGiveawayCreation(page); state.abort = true; state.applyOnAbort = applied;
  await submit(page).click(); await expect(page.getByText(/Результат создания неизвестен/)).toBeVisible(); await expect(submit(page)).toBeDisabled();
  await page.getByRole("button", { name: "Проверить историю", exact: true }).click();
  await expect(page.getByText(/совпадение названия не подтверждает создание/)).toBeVisible(); await expect(submit(page)).toBeDisabled();
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("link", { name: "К истории розыгрышей", exact: true }).click(); await expect(page).toHaveURL(/\/admin\/giveaways$/);
  await page.getByRole("link", { name: "Создать розыгрыш", exact: true }).click(); await expect(name(page)).toHaveValue("Новый приз"); await expect(submit(page)).toBeDisabled(); expect(state.creates).toHaveLength(1);
});

test("pending POST guard survives ADMIN role remount and blocks double submit", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL), gate = deferred(); state.gate = gate.promise;
  await open(page); await fillGiveawayCreation(page); await submit(page).dblclick(); await expect.poll(() => state.creates.length).toBe(1);
  state.api.admin.role = "USER"; await reconnect(page); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  state.api.admin.role = "ADMIN"; await reconnect(page); await expect(submit(page)).toBeDisabled(); await expect(name(page)).toHaveValue("Новый приз");
  gate.resolve(); await expect(page).toHaveURL(/\/admin\/giveaways$/); expect(state.creates).toHaveLength(1);
});

test("pending PRODUCT upload excludes creation and survives role remount", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL), gate = deferred(); state.uploadGate = gate.promise;
  await open(page); await fillGiveawayCreation(page); await page.locator('input[type="file"]').setInputFiles(giveawayImageFile);
  await expect.poll(() => state.uploads.length).toBe(1); await expect(submit(page)).toBeDisabled();
  state.api.admin.role = "USER"; await reconnect(page); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  state.api.admin.role = "ADMIN"; await reconnect(page); await expect(submit(page)).toBeDisabled(); gate.resolve();
  await expect(page.getByRole("button", { name: "Убрать фото #77" })).toBeVisible(); await expect(submit(page)).toBeEnabled(); expect(state.creates).toEqual([]); expect(state.uploads).toHaveLength(1);
});

test("dirty navigation is confirmable, creation draft is memory-only, mobile form fits", async ({ page, baseURL }) => {
  await setupGiveawayCreation(page, baseURL); await page.setViewportSize({ width: 393, height: 852 }); await open(page); await fillGiveawayCreation(page);
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("link", { name: "← К истории розыгрышей", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/giveaways\/new$/); await expect(name(page)).toHaveValue("Новый приз");
  for (const width of [320, 393]) { await page.setViewportSize({ width, height: 852 }); await expectNoOverflow(page); }
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("Новый приз");
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("link", { name: "← К истории розыгрышей", exact: true }).click();
  for (const width of [320, 393]) { await page.setViewportSize({ width, height: 852 }); await expectNoOverflow(page); }
  await page.getByRole("link", { name: "Создать розыгрыш", exact: true }).click(); await expect(name(page)).toHaveValue("Новый приз");
});

test("fresh ADMIN check before POST prevents a write after role revocation", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await open(page); await fillGiveawayCreation(page);
  state.api.admin.role = "USER"; await submit(page).click(); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible(); expect(state.creates).toEqual([]);
  state.api.admin.role = "ADMIN"; await reconnect(page); await expect(name(page)).toHaveValue("Новый приз"); await expect(submit(page)).toBeEnabled(); expect(state.creates).toEqual([]);
});

test("disabled creation accepts a past valid window, while enabling it cannot POST", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await open(page); await fillGiveawayCreation(page);
  await page.getByRole("textbox", { name: "Начало (ISO 8601)", exact: true }).fill("2027-05-01T12:00:00Z");
  await page.getByRole("textbox", { name: "Окончание (ISO 8601)", exact: true }).fill("2027-05-02T12:00:00Z"); await submit(page).click();
  await expect(page.getByText("Для включения окончание должно быть в будущем")).toBeVisible(); expect(state.creates).toEqual([]);
  await page.getByRole("checkbox", { name: "Розыгрыш включён", exact: true }).uncheck(); await submit(page).click();
  await expect(page).toHaveURL(/\/admin\/giveaways$/); expect(state.creates[0].giveaway?.enabled).toBe(false); expect(state.public).toBeNull();
});

test("end passing during ADMIN preflight prevents POST without creating an unknown attempt", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await open(page); await fillGiveawayCreation(page);
  const started = deferred(), release = deferred();
  await page.route("http://127.0.0.1:9/auth/profile", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    started.resolve(); await release.promise;
    return fulfillJson(route, { id: 1, role: "ADMIN", login: "administrator", imageId: null, exp: 0, type: "access" });
  });
  await submit(page).click(); await started.promise;
  await page.clock.setFixedTime(new Date("2027-06-03T12:00:00Z")); release.resolve();
  await expect(page.getByText("Для включения окончание должно быть в будущем")).toBeVisible();
  await expect(submit(page)).toBeEnabled(); await expect(name(page)).toHaveValue("Новый приз"); expect(state.creates).toEqual([]);
});
