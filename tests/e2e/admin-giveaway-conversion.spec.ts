import { expect, test, type Page } from "@playwright/test";
import { setupGiveawayConversion, fillConversion, botGiveawayFixture } from "./helpers/adminGiveawayConversion";
import { deferred } from "./helpers/adminGiveaway";
import { expectNoOverflow, fulfillJson } from "./helpers/mobileAccount";

const save = (page: Page) => page.getByRole("button", { name: "Сохранить изменения", exact: true });
const check = (page: Page) => page.getByRole("button", { name: "Проверить актуальные данные", exact: true });
const rules = (page: Page) => page.getByRole("textbox", { name: "Правила участия", exact: true });
const reconnect = (page: Page) => page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
const open = async (page: Page) => { await page.goto("/admin/products/101"); await expect(save(page)).toBeEnabled(); };

test("pending regular status operation excludes conversion and saving until a fresh baseline is explicitly adopted", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await open(page);
  const started = deferred(), release = deferred();
  await page.route("http://127.0.0.1:9/admin/actions/product/101?*", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    started.resolve(); await release.promise; state.product.status = "BLOCKED"; return fulfillJson(route, null);
  });
  await page.getByRole("button", { name: "Заблокировать", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Подтвердить", exact: true }).click(); await started.promise;
  try {
    await expect(page.getByRole("button", { name: "Преобразовать в розыгрыш", exact: true, includeHidden: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true, includeHidden: true })).toBeDisabled();
    expect(state.writes).toEqual([]);
  } finally { release.resolve(); }
  await expect(page.getByText("Статус товара обновлён")).toBeVisible();
  await expect(page.getByText(/Товар или настройки изменились/)).toBeVisible();
  await page.getByRole("button", { name: "Перечитать форму", exact: true }).click(); await expect(save(page)).toBeEnabled(); expect(state.writes).toEqual([]);
});

for (const existing of [false, true]) test(`both editors preserve latest settings/relations in one navigation session, existing=${existing}`, async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL);
  if (existing) state.product = { ...botGiveawayFixture(), used: true, currency: "CREATE" };
  await open(page);
  if (!existing) { await fillConversion(page); await save(page).click(); await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible(); }
  const publicReads = state.reads.filter(path => path === "/product/101").length;
  await page.getByRole("link", { name: "Настройки розыгрыша", exact: true }).click();
  await expect(page.getByRole("button", { name: "Сохранить настройки", exact: true })).toBeEnabled();
  await rules(page).fill("Настройки A из отдельного редактора"); await page.getByRole("button", { name: "Сохранить настройки", exact: true }).click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible();
  await page.getByRole("link", { name: "Редактор товара бота", exact: true }).click();
  await expect(page.getByText(/Товар или настройки изменились/)).toBeVisible();
  await expect(save(page)).toBeDisabled(); page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Перечитать форму", exact: true }).click();
  await expect(rules(page)).toHaveValue("Настройки A из отдельного редактора"); await expect(save(page)).toBeEnabled();
  await page.getByLabel("Описание", { exact: true }).fill("Изменено только описание"); await save(page).click();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes.at(-1)?.body).toMatchObject({ giveaway: { rules: "Настройки A из отдельного редактора" }, categoryIds: [1, 2], imageIds: [77, 78], description: "Изменено только описание", currency: existing ? "CREATE" : "RUB" });
  await rules(page).fill("Настройки B из редактора товара"); await save(page).click(); await expect(save(page)).toBeEnabled();
  await page.getByRole("link", { name: "Настройки розыгрыша", exact: true }).click();
  await expect(page.getByText(/Настройки изменились на сервере/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить настройки", exact: true })).toBeDisabled();
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Перечитать форму", exact: true }).click(); await expect(rules(page)).toHaveValue("Настройки B из редактора товара");
  await page.getByRole("textbox", { name: "Текст на главной", exact: true }).fill("Главная C");
  await page.getByRole("button", { name: "Сохранить настройки", exact: true }).click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible();
  expect(state.writes.at(-1)?.body).toMatchObject({ rules: "Настройки B из редактора товара", homeText: "Главная C" });
  expect(state.reads.filter(path => path === "/product/101")).toHaveLength(publicReads);
});

for (const applied of [false, true]) test(`lost conversion response applied=${applied}: persistent guard and GET-only recovery`, async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await open(page); await fillConversion(page);
  state.abort = true; state.applyOnAbort = applied; await save(page).click();
  if (applied) await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  else { await expect(page.getByText(/Результат PUT неизвестен/)).toBeVisible(); await expect(save(page)).toBeDisabled(); }
  state.abort = false; await check(page).click();
  if (!applied) { await expect(save(page)).toBeDisabled(); await expect(rules(page)).toHaveValue("Правила бота"); }
  expect(state.writes).toHaveLength(1);
});

test("accepted conversion with failed control GET survives role remount and retries only reads", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await open(page); await fillConversion(page);
  state.failAfterWrite = true; await save(page).click(); await expect(page.getByText(/Результат требует проверки/)).toBeVisible();
  await expect(save(page)).toBeDisabled(); const publicReads = state.reads.filter(path => path === "/product/101").length;
  state.admin.role = "USER"; await reconnect(page); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  state.readStatus = 200; state.admin.role = "ADMIN"; await reconnect(page); await expect(rules(page)).toHaveValue("Правила бота");
  await check(page).click(); await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible(); await expect(save(page)).toBeEnabled();
  expect(state.writes).toHaveLength(1); expect(state.reads.filter(path => path === "/product/101")).toHaveLength(publicReads);
});

test("pending PUT survives role remount; double submit and competing settings PUT are excluded", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await open(page); await fillConversion(page);
  const gate = deferred(); state.putGate = gate.promise;
  await save(page).click(); await expect.poll(() => state.writes.length).toBe(1); await expect(save(page)).toBeDisabled();
  state.admin.role = "USER"; await reconnect(page); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  state.admin.role = "ADMIN"; await reconnect(page); await expect(save(page)).toBeDisabled();
  await expect(rules(page)).toHaveValue("Правила бота"); gate.resolve();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible(); expect(state.writes).toHaveLength(1);
});

test("preflight catches changed owner and later endAt without sending PUT, draft survives owner recovery", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await open(page); await fillConversion(page);
  state.product.participantId = 99; await save(page).click(); await expect(page.getByText(/Владелец не входит/)).toBeVisible(); expect(state.writes).toEqual([]);
  state.product.participantId = 2; await page.getByRole("button", { name: "Перепроверить владельца", exact: true }).click();
  await expect(rules(page)).toHaveValue("Правила бота"); await check(page).click(); await expect(save(page)).toBeEnabled();
  const started = deferred(), release = deferred(); state.readGate = async path => { if (path === "/admin/actions/products/101") { started.resolve(); await release.promise; } };
  await save(page).click(); await started.promise; await page.clock.setFixedTime(new Date("2027-06-04T12:00:00Z")); release.resolve();
  await expect(page.getByText("Для включения окончание должно быть в будущем")).toBeVisible(); expect(state.writes).toEqual([]);
});

test("dirty background refresh blocks PUT until explicit fresh baseline", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); state.product = botGiveawayFixture(); await open(page);
  await page.getByLabel("Описание", { exact: true }).fill("Не потерять ввод");
  state.product.giveawayRules = "Конкурирующие правила";
  await check(page).click(); await expect(page.getByLabel("Описание", { exact: true })).toHaveValue("Не потерять ввод");
  await expect(save(page)).toBeDisabled(); expect(state.writes).toEqual([]);
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Перечитать форму", exact: true }).click();
  await expect(rules(page)).toHaveValue("Конкурирующие правила"); await save(page).click(); await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes[0].body).toMatchObject({ giveaway: { rules: "Конкурирующие правила" }, categoryIds: [1, 2], imageIds: [77, 78] });
});

test("late old preview GET cannot replace fresh settings or editor baseline after settings PUT", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); state.product = botGiveawayFixture();
  const started = deferred(), release = deferred(), completed = deferred(); let first = true;
  state.readGate = async path => { if (path === "/admin/actions/giveaways/101" && first) { first = false; started.resolve(); await release.promise; completed.resolve(); } };
  await page.goto("/admin/products?agent=2&status="); await started.promise;
  await page.getByRole("link", { name: "Настройки розыгрыша", exact: true }).click();
  await expect(page.getByRole("button", { name: "Сохранить настройки", exact: true })).toBeEnabled();
  await rules(page).fill("Новые правила после старого preview"); await page.getByRole("button", { name: "Сохранить настройки", exact: true }).click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible(); release.resolve(); await completed.promise;
  await page.getByRole("link", { name: "Редактор товара бота", exact: true }).click();
  await expect(rules(page)).toHaveValue("Новые правила после старого preview"); await expect(save(page)).toBeEnabled();
  await save(page).click(); await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes.at(-1)?.body).toMatchObject({ giveaway: { rules: "Новые правила после старого preview" } });
  expect(state.reads).not.toContain("/product/101");
});

test("revoked ADMIN during preflight prevents a late PUT and preserves the conversion draft", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await open(page); await fillConversion(page);
  const started = deferred(), release = deferred(); let once = true;
  state.readGate = async path => { if (path === "/admin/actions/products/101" && once) { once = false; started.resolve(); await release.promise; } };
  await save(page).click(); await started.promise; state.admin.role = "USER"; await reconnect(page);
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible(); release.resolve();
  state.admin.role = "ADMIN"; await reconnect(page); await expect(rules(page)).toHaveValue("Правила бота");
  await check(page).click(); await expect(save(page)).toBeEnabled(); expect(state.writes).toEqual([]);
});

test("conversion validates safe Telegram/dates, keeps draft in memory and fits 320/393", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await open(page); await fillConversion(page);
  await page.getByRole("textbox", { name: "Telegram-ссылка", exact: true }).fill("https://t.me/"); await save(page).click();
  await expect(page.getByText(/Укажите HTTPS-ссылку/)).toBeVisible(); expect(state.writes).toEqual([]);
  for (const width of [320, 393]) { await page.setViewportSize({ width, height: 800 }); await expectNoOverflow(page); }
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /giveaway|product-operation/.test(key)))).toEqual([]);
});
