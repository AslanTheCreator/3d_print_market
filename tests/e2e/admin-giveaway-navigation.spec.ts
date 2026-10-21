import { expect, test, type Page } from "@playwright/test";
import { adminGiveawayFixture, setupAdminGiveaway } from "./helpers/adminGiveaway";
import { fillGiveawayCreation, setupGiveawayCreation } from "./helpers/adminGiveawayCreate";
import { fillConversion, setupGiveawayConversion } from "./helpers/adminGiveawayConversion";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const rules = (page: Page) => page.getByRole("textbox", { name: "Правила участия", exact: true });
const menu = (page: Page, name: string) => page.getByRole("list", { name: "Разделы администрирования" }).getByRole("link", { name, exact: true });
const markDocument = (page: Page) => page.evaluate(() => { document.documentElement.dataset.navigationProbe = "original-document"; });
const expectSameDocument = (page: Page) => expect(page.locator("html")).toHaveAttribute("data-navigation-probe", "original-document");

test("unknown settings PUT survives the history backlink and its settings link; recovery stays scoped", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL);
  state.products.push(adminGiveawayFixture(8102));
  await page.goto("/admin/giveaways/8101"); await expect(button(page, "Сохранить настройки")).toBeEnabled(); await markDocument(page);
  state.abort = true; await rules(page).fill("Неопределённые настройки"); await button(page, "Сохранить настройки").click();
  await expect(page.getByText(/Результат PUT пока неизвестен/)).toBeVisible(); await expect(button(page, "Сохранить настройки")).toBeDisabled();
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("link", { name: "← К истории розыгрышей", exact: true }).click();
  await page.getByRole("link", { name: "Настройки розыгрыша #8102", exact: true }).click();
  state.abort = false; await expect(button(page, "Сохранить настройки")).toBeEnabled();
  await rules(page).fill("Независимые настройки"); await button(page, "Сохранить настройки").click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible();
  await page.getByRole("link", { name: "← К истории розыгрышей", exact: true }).click();
  await page.getByRole("link", { name: "Настройки розыгрыша #8101", exact: true }).click();
  await expectSameDocument(page); await expect(rules(page)).toHaveValue("Неопределённые настройки");
  await expect(button(page, "Сохранить настройки")).toBeDisabled(); await button(page, "Проверить актуальные данные").click();
  await expect(button(page, "Проверить актуальные данные")).toBeEnabled(); await expect(button(page, "Сохранить настройки")).toBeDisabled();
  expect(state.writes).toHaveLength(2); expect(state.products[0].giveawayRules).toBe("Исходные правила");
  state.products[0].giveawayRules = "Неопределённые настройки"; await button(page, "Проверить актуальные данные").click();
  await expect(button(page, "Сохранить настройки")).toBeEnabled(); expect(state.writes).toHaveLength(2);
});

test("unknown creation POST survives sidebar navigation and permits an independent settings PUT", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL);
  await page.goto("/admin/giveaways/new"); await expect(button(page, "Создать розыгрыш")).toBeEnabled(); await markDocument(page);
  await fillGiveawayCreation(page); state.abort = true; await button(page, "Создать розыгрыш").click();
  await expect(page.getByText(/Результат создания неизвестен/)).toBeVisible();
  page.once("dialog", dialog => dialog.accept()); await menu(page, "Розыгрыши").click();
  await page.getByRole("link", { name: "Настройки розыгрыша #8101", exact: true }).click();
  await expect(button(page, "Сохранить настройки")).toBeEnabled(); await rules(page).fill("Независимый PUT после POST");
  await button(page, "Сохранить настройки").click(); await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible();
  await menu(page, "Розыгрыши").click(); await page.getByRole("link", { name: "Создать розыгрыш", exact: true }).click();
  await expectSameDocument(page); await expect(page.getByRole("textbox", { name: "Название приза", exact: true })).toHaveValue("Новый приз");
  await expect(button(page, "Создать розыгрыш")).toBeDisabled(); await button(page, "Проверить историю").click();
  await expect(page.getByText(/совпадение названия не подтверждает создание/)).toBeVisible();
  await expect(button(page, "Создать розыгрыш")).toBeDisabled(); expect(state.creates).toHaveLength(1); expect(state.api.writes).toHaveLength(1);
});

test("unknown conversion PUT survives the products menu and list editor link without losing draft or guard", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL);
  await page.goto("/admin/products/101"); await expect(button(page, "Сохранить изменения")).toBeEnabled(); await markDocument(page);
  await fillConversion(page); state.abort = true; await button(page, "Сохранить изменения").click();
  await expect(page.getByText(/Результат PUT неизвестен/)).toBeVisible();
  page.once("dialog", dialog => dialog.accept()); await menu(page, "Товары").click();
  const editor = page.getByRole("link", { name: "Редактировать", exact: true }).and(page.locator('a[href^="/admin/products/101?"]'));
  await expect(editor).toHaveCount(1); await editor.click(); await expect(page).toHaveURL(/\/admin\/products\/101\?/);
  await expectSameDocument(page); await expect(rules(page)).toHaveValue("Правила бота"); await expect(button(page, "Сохранить изменения")).toBeDisabled();
  await button(page, "Проверить актуальные данные").click(); await expect(button(page, "Проверить актуальные данные")).toBeEnabled();
  await expect(button(page, "Сохранить изменения")).toBeDisabled(); expect(state.writes).toHaveLength(1);
  const { giveaway, ...fields } = state.writes[0].body;
  const settings = giveaway as Record<string, unknown>;
  Object.assign(state.product, fields, { status: "AWAITING_GIVEAWAY", count: null, prepaymentAmount: null, giveawayEnabled: settings.enabled,
    giveawayTelegramUrl: settings.telegramUrl, giveawayStartAt: settings.startAt, giveawayEndAt: settings.endAt,
    giveawayWinnersCount: settings.winnersCount, giveawayRules: settings.rules, giveawayHomeText: settings.homeText });
  await button(page, "Проверить актуальные данные").click(); await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  await expect(button(page, "Сохранить изменения")).toBeEnabled(); expect(state.writes).toHaveLength(1);
});

test("admin sidebar, bot links, tabs and backlinks retain the root document", async ({ page, baseURL }) => {
  await setupAdminGiveaway(page, baseURL); await page.goto("/admin/giveaways");
  await expect(page.getByRole("heading", { name: "Розыгрыши", exact: true })).toBeVisible(); await markDocument(page);
  await menu(page, "Боты").click(); await page.getByRole("link", { name: "Открыть бота", exact: true }).first().click();
  for (const name of ["Товары", "Настройки", "Заказы"]) { await page.getByRole("tab", { name, exact: true }).click(); await expectSameDocument(page); }
  await page.getByRole("link", { name: "Обращения по всем заказам", exact: true }).click(); await expectSameDocument(page);
  await menu(page, "Боты").click(); await page.getByRole("link", { name: "Открыть бота", exact: true }).first().click();
  await page.getByRole("link", { name: "← Все боты", exact: true }).click(); await expectSameDocument(page);
});
