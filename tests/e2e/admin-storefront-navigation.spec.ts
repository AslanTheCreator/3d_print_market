import { expect, test, type Page } from "@playwright/test";
import { adminProductFixture } from "./helpers/admin";
import { adminGiveawayFixture, deferred, setupAdminGiveaway } from "./helpers/adminGiveaway";
import { fillGiveawayCreation, setupGiveawayCreation } from "./helpers/adminGiveawayCreate";
import { fillConversion, setupGiveawayConversion } from "./helpers/adminGiveawayConversion";
import { fulfillJson } from "./helpers/mobileAccount";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const link = (page: Page, name: string) => page.getByRole("link", { name, exact: true });
const rules = (page: Page) => page.getByRole("textbox", { name: "Правила участия", exact: true });
const menu = (page: Page, name: string) => page.getByRole("list", { name: "Разделы администрирования" }).getByRole("link", { name, exact: true });
const sameDocument = (page: Page) => expect(page.locator("html")).toHaveAttribute("data-navigation-probe", "original");
const mark = (page: Page) => page.evaluate(() => { document.documentElement.dataset.navigationProbe = "original"; });
const reconnect = (page: Page) => page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });

async function storefront(page: Page, participantId = () => 1) {
  await page.route("http://127.0.0.1:9/participant", route => fulfillJson(route, {
    id: participantId(), login: "administrator", mail: "admin@example.test", fullName: "Администратор", phoneNumber: "", status: "ACTIVE", sellerStatus: "DEFAULT",
    imageId: null, addresses: [], accounts: [], transfers: [], socialNetworks: [],
  }));
  await page.route("http://127.0.0.1:9/giveaways/active", route => fulfillJson(route, { message: "Нет розыгрыша" }, 404));
  await page.route("http://127.0.0.1:9/products/find", route => fulfillJson(route, []));
}
async function toProfileViaStorefront(page: Page, dirty = true) {
  if (dirty) page.once("dialog", dialog => dialog.accept());
  await link(page, "В личный кабинет").click(); await expect(page).toHaveURL(/\/dashboard$/); await sameDocument(page);
  await link(page, "Figurzilla").click(); await expect(page).toHaveURL(/\/$/); await sameDocument(page);
  await page.getByRole("navigation", { name: "Действия в шапке сайта" }).getByRole("link", { name: "Профиль", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/); await sameDocument(page); await expect(link(page, "Администрирование")).toBeVisible();
}
async function returnToAdmin(page: Page) {
  await link(page, "Администрирование").click(); await expect(page.getByRole("heading", { name: "Заказы", exact: true })).toBeVisible(); await sameDocument(page);
}
async function readAfter(page: Page, path: string, action: () => Promise<unknown>) {
  const response = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === path);
  await action(); await (await response).finished();
}

test("Astra stage 9: unknown settings PUT survives ADMIN/storefront/profile/ADMIN, GET recovery and independent PUT", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await storefront(page); state.products.push(adminGiveawayFixture(8102));
  await page.goto("/admin/giveaways/8101"); await expect(button(page, "Сохранить настройки")).toBeEnabled(); await mark(page);
  await rules(page).fill("Сохранить ввод этапа 9"); state.abort = true; await button(page, "Сохранить настройки").click();
  await expect(page.getByText(/Результат PUT пока неизвестен/)).toBeVisible();
  await toProfileViaStorefront(page); await returnToAdmin(page); await menu(page, "Розыгрыши").click();
  await link(page, "Настройки розыгрыша #8101").click(); await sameDocument(page);
  await expect(rules(page)).toHaveValue("Сохранить ввод этапа 9"); await expect(button(page, "Сохранить настройки")).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Telegram-ссылка", exact: true })).toHaveValue("https://t.me/original");
  await readAfter(page, "/admin/actions/giveaways/8101", () => button(page, "Проверить актуальные данные").click());
  await expect(button(page, "Проверить актуальные данные")).toBeEnabled(); await expect(button(page, "Сохранить настройки")).toBeDisabled(); expect(state.writes).toHaveLength(1);
  page.once("dialog", dialog => dialog.accept()); await link(page, "← К истории розыгрышей").click(); await link(page, "Настройки розыгрыша #8102").click();
  state.abort = false; await expect(button(page, "Сохранить настройки")).toBeEnabled(); await rules(page).fill("Независимые настройки");
  await button(page, "Сохранить настройки").click(); await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible();
  await link(page, "← К истории розыгрышей").click(); await link(page, "Настройки розыгрыша #8101").click();
  await expect(rules(page)).toHaveValue("Сохранить ввод этапа 9"); await expect(button(page, "Сохранить настройки")).toBeDisabled();
  expect(state.writes).toHaveLength(2); expect(state.writes.filter(write => write.rules === "Сохранить ввод этапа 9")).toHaveLength(1);
  state.products[0].giveawayRules = "Сохранить ввод этапа 9"; await button(page, "Проверить актуальные данные").click();
  await expect(button(page, "Сохранить настройки")).toBeEnabled(); expect(state.writes).toHaveLength(2);
});

test("Astra stage 10: unknown disabled GIVEAWAY POST retains draft and guard through the full storefront path", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await storefront(page);
  await page.goto("/admin/giveaways/new"); await expect(button(page, "Создать розыгрыш")).toBeEnabled(); await mark(page); await fillGiveawayCreation(page);
  await page.getByRole("checkbox", { name: "Розыгрыш включён", exact: true }).uncheck(); state.abort = true; await button(page, "Создать розыгрыш").click();
  await expect(page.getByText(/Результат создания неизвестен/)).toBeVisible();
  await toProfileViaStorefront(page); await returnToAdmin(page); await menu(page, "Розыгрыши").click(); await link(page, "Создать розыгрыш").click();
  await sameDocument(page); await expect(page.getByRole("textbox", { name: "Название приза", exact: true })).toHaveValue("Новый приз");
  await expect(page.getByRole("textbox", { name: "Описание приза", exact: true })).toHaveValue("Описание нового приза");
  await expect(rules(page)).toHaveValue("Правила нового розыгрыша"); await expect(page.getByRole("checkbox", { name: "Розыгрыш включён", exact: true })).not.toBeChecked();
  await expect(button(page, "Создать розыгрыш")).toBeDisabled();
  await readAfter(page, "/admin/actions/giveaways/history", () => button(page, "Проверить историю").click());
  await expect(page.getByText(/совпадение названия не подтверждает создание/)).toBeVisible(); await expect(button(page, "Создать розыгрыш")).toBeDisabled();
  page.once("dialog", dialog => dialog.accept()); await menu(page, "Розыгрыши").click(); await link(page, "Настройки розыгрыша #8101").click();
  await expect(button(page, "Сохранить настройки")).toBeEnabled(); await rules(page).fill("Независимо от создания"); await button(page, "Сохранить настройки").click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible();
  await menu(page, "Розыгрыши").click(); await link(page, "Создать розыгрыш").click(); await expect(button(page, "Создать розыгрыш")).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Название приза", exact: true })).toHaveValue("Новый приз");
  expect(state.creates).toHaveLength(1); expect(state.creates[0].giveaway?.enabled).toBe(false); expect(state.api.writes).toHaveLength(1);
});

test("Astra stage 11: unknown conversion PUT survives the full storefront path while another bot product stays writable", async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await storefront(page); state.admin.products.push(adminProductFixture(102, 3));
  await page.goto("/admin/products/101"); await expect(button(page, "Сохранить изменения")).toBeEnabled(); await mark(page); await fillConversion(page);
  await page.getByRole("textbox", { name: "Название", exact: true }).fill("Черновик преобразования"); state.abort = true; await button(page, "Сохранить изменения").click();
  await expect(page.getByText(/Результат PUT неизвестен/)).toBeVisible(); await toProfileViaStorefront(page); await returnToAdmin(page);
  await menu(page, "Товары").click(); await page.locator('a[href^="/admin/products/101?"]').click(); await sameDocument(page);
  await expect(rules(page)).toHaveValue("Правила бота"); await expect(page.getByRole("textbox", { name: "Название", exact: true })).toHaveValue("Черновик преобразования");
  await expect(button(page, "Сохранить изменения")).toBeDisabled();
  await readAfter(page, "/admin/actions/products/101", () => button(page, "Проверить актуальные данные").click());
  await expect(button(page, "Проверить актуальные данные")).toBeEnabled(); await expect(button(page, "Сохранить изменения")).toBeDisabled(); expect(state.writes).toHaveLength(1);
  page.once("dialog", dialog => dialog.accept()); await menu(page, "Товары").click(); await page.locator('a[href^="/admin/products/102?"]').click();
  await expect(button(page, "Сохранить изменения")).toBeEnabled(); await page.getByRole("textbox", { name: "Название", exact: true }).fill("Другой товар");
  await button(page, "Сохранить изменения").click(); await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  await menu(page, "Товары").click(); await page.locator('a[href^="/admin/products/101?"]').click();
  await expect(rules(page)).toHaveValue("Правила бота"); await expect(button(page, "Сохранить изменения")).toBeDisabled();
  expect(state.writes).toHaveLength(1); expect(state.admin.writes.filter(write => write.path === "/admin/actions/agents/3/products/102")).toHaveLength(1);
});

test("revoked ADMIN on return blocks the old form; role restoration recovers its guarded draft", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await storefront(page);
  await page.goto("/admin/giveaways/8101"); await expect(button(page, "Сохранить настройки")).toBeEnabled(); await mark(page);
  await rules(page).fill("Приватный draft"); state.abort = true; await button(page, "Сохранить настройки").click(); await expect(page.getByText(/Результат PUT пока неизвестен/)).toBeVisible();
  await toProfileViaStorefront(page); state.admin.role = "USER"; await link(page, "Администрирование").click();
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible(); await expect(rules(page)).toHaveCount(0); await sameDocument(page); expect(state.writes).toHaveLength(1);
  await link(page, "В кабинет").click(); await expect(link(page, "Администрирование")).toHaveCount(0);
  state.admin.role = "ADMIN"; await reconnect(page); await returnToAdmin(page);
  await menu(page, "Розыгрыши").click(); await link(page, "Настройки розыгрыша #8101").click();
  await expect(rules(page)).toHaveValue("Приватный draft"); await expect(button(page, "Сохранить настройки")).toBeDisabled(); expect(state.writes).toHaveLength(1);
});

test("logout and new ADMIN login in the same document remove the old creation draft and guard", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); let principal = 1; await storefront(page, () => principal);
  await page.route("http://127.0.0.1:9/auth/profile", route => fulfillJson(route, { id: principal, login: `admin-${principal}`, role: "ADMIN", imageId: null, exp: 0, type: "access" }));
  await page.route("http://127.0.0.1:9/auth/login", route => fulfillJson(route, { access_token: "new-admin-session", refresh_token: "new-admin-refresh" }));
  await page.goto("/admin/giveaways/new"); await expect(button(page, "Создать розыгрыш")).toBeEnabled(); await mark(page); await fillGiveawayCreation(page);
  state.abort = true; await button(page, "Создать розыгрыш").click(); await expect(page.getByText(/Результат создания неизвестен/)).toBeVisible();
  await toProfileViaStorefront(page); await button(page, "Выход").click(); await expect(page).toHaveURL(/\/auth\/login/); await sameDocument(page);
  principal = 42;
  await page.getByLabel(/^Email/).fill("other-admin@example.test"); await page.getByLabel(/^Пароль/).fill("fixture-password"); await button(page, "Войти").click();
  await expect(button(page, "Войти")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Действия в шапке сайта" }).getByRole("link", { name: "Профиль", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await returnToAdmin(page); await menu(page, "Розыгрыши").click(); await link(page, "Создать розыгрыш").click();
  await expect(page.getByRole("textbox", { name: "Название приза", exact: true })).toHaveValue(""); await expect(rules(page)).toHaveValue("");
  await expect(button(page, "Создать розыгрыш")).toBeEnabled(); expect(state.creates).toHaveLength(1);
});

test("accepted POST with a failed control GET survives the storefront path and completes through GET only", async ({ page, baseURL }) => {
  const state = await setupGiveawayCreation(page, baseURL); await storefront(page);
  await page.goto("/admin/giveaways/new"); await expect(button(page, "Создать розыгрыш")).toBeEnabled(); await mark(page); await fillGiveawayCreation(page);
  state.failHistory = true; await button(page, "Создать розыгрыш").click(); await expect(page.getByText(/Розыгрыш создан, но связанные данные не обновлены/)).toBeVisible();
  await toProfileViaStorefront(page); await returnToAdmin(page); await menu(page, "Розыгрыши").click(); await link(page, "Создать розыгрыш").click();
  await sameDocument(page); await expect(page.getByRole("textbox", { name: "Название приза", exact: true })).toHaveValue("Новый приз");
  await expect(button(page, "Создать розыгрыш")).toBeDisabled(); state.api.historyStatus = 200;
  await readAfter(page, "/admin/actions/giveaways/history", () => button(page, "Обновить данные после создания").click());
  await expect(page).toHaveURL(/\/admin\/giveaways$/); await expect(page.getByText("Розыгрыш создан. История и связанные данные обновлены.")).toBeVisible(); expect(state.creates).toHaveLength(1);
});

const analyticsStub = `(() => {
  const queued = window.ym?.a || [];
  window.analyticsEvents = []; window.analyticsPrivateSnapshots = [];
  let observer;
  const privateDom = () => !!document.querySelector('[aria-label="Разделы администрирования"]');
  window.ym = (id, command) => {
    window.analyticsEvents.push({ command, privateDom: privateDom() });
    if (command === 'init') {
      observer = new MutationObserver(() => { if (privateDom()) window.analyticsPrivateSnapshots.push('ADMIN'); });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    if (command === 'destruct') { observer?.disconnect(); }
  };
  for (const args of queued) window.ym(...args);
})();`;
const analytics = (page: Page) => page.evaluate(() => {
  const target = window as Window & { analyticsEvents?: { command: string; privateDom: boolean }[]; analyticsPrivateSnapshots?: string[] };
  return { events: target.analyticsEvents ?? [], snapshots: target.analyticsPrivateSnapshots ?? [] };
});

for (const delayed of [false, true]) test(`analytics stops before ADMIN DOM and late tag cannot init there; delayed=${delayed}`, async ({ page, baseURL }) => {
  await setupGiveawayCreation(page, baseURL); await storefront(page);
  const started = deferred(), release = deferred();
  await page.route("https://mc.yandex.ru/metrika/tag.js", async route => {
    started.resolve(); if (delayed) await release.promise;
    await route.fulfill({ contentType: "text/javascript", body: analyticsStub });
  });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" }); await expect(link(page, "Администрирование")).toBeVisible(); await mark(page); await started.promise;
  if (!delayed) await expect.poll(async () => (await analytics(page)).events.map(event => event.command)).toEqual(["init"]);
  await returnToAdmin(page);
  if (delayed) {
    const response = page.waitForResponse("https://mc.yandex.ru/metrika/tag.js"); release.resolve(); await (await response).finished();
    // Выполнение скрипта подтверждает явный browser signal, без задержки.
    await expect.poll(() => page.evaluate(() => "analyticsEvents" in window)).toBe(true);
    expect((await analytics(page)).events).toEqual([]);
  } else expect((await analytics(page)).events.map(event => event.command)).toEqual(["init", "destruct"]);
  expect((await analytics(page)).snapshots).toEqual([]);
  await link(page, "В личный кабинет").click(); await expect(link(page, "Администрирование")).toBeVisible(); await sameDocument(page);
  await expect.poll(async () => (await analytics(page)).events.map(event => event.command)).toEqual(delayed ? ["init"] : ["init", "destruct", "init"]);
  expect((await analytics(page)).events.every(event => !event.privateDom)).toBe(true); expect((await analytics(page)).snapshots).toEqual([]);
});
