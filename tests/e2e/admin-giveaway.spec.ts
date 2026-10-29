import { expect, test, type Page } from "@playwright/test";
import { adminGiveawayFixture, deferred, setupAdminGiveaway } from "./helpers/adminGiveaway";
import { expectNoOverflow, fulfillJson } from "./helpers/mobileAccount";

const save = (page: Page) => page.getByRole("button", { name: "Сохранить настройки", exact: true });
const check = (page: Page) => page.getByRole("button", { name: "Проверить актуальные данные", exact: true });
const rules = (page: Page) => page.getByRole("textbox", { name: "Правила участия", exact: true });
const reconnect = (page: Page) => page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
const open = async (page: Page, id = 8101) => {
  await page.goto(`/admin/giveaways/${id}`); await expect(save(page)).toBeEnabled();
};

test("history includes scheduled, running, ended and disabled with independent status/enabled; 50 then empty next page", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL);
  state.products = Array.from({ length: 50 }, (_, index) => adminGiveawayFixture(8101 + index, {
    status: ["AWAITING_GIVEAWAY", "ACTIVE", "TIME_EXPIRED", "BLOCKED"][index % 4] as "ACTIVE", giveawayEnabled: index % 4 !== 3,
  }));
  await page.goto("/admin/giveaways");
  await expect(page.getByRole("link", { name: /Настройки розыгрыша #/ })).toHaveCount(50);
  for (const status of ["AWAITING_GIVEAWAY", "ACTIVE", "TIME_EXPIRED", "BLOCKED"]) await expect(page.getByText(`Статус товара: ${status}`, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Публичный показ: выключен", { exact: true }).first()).toBeVisible();
  expect(state.reads).toContain("/admin/actions/giveaways/history?page=0&size=50");
  await page.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(page.getByText("На этой странице розыгрышей нет")).toBeVisible();
  await expect(page.getByText("Страница 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Далее", exact: true })).toBeDisabled();
  expect(state.reads).toContain("/admin/actions/giveaways/history?page=1&size=50");
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.getByRole("link", { name: /Настройки розыгрыша #/ })).toHaveCount(50);
  await expect(page.getByRole("link", { name: "Создать розыгрыш", exact: true })).toHaveAttribute("href", "/admin/giveaways/new");
});

test("USER cannot read history/details or PUT; invalid ID starts no admin giveaway reads", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL, "USER");
  for (const url of ["/admin/giveaways", "/admin/giveaways/8101"]) {
    await page.goto(url); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  }
  expect(state.reads).toEqual([]); expect(state.writes).toEqual([]);
  state.admin.role = "ADMIN";
  await page.goto("/admin/giveaways/0"); await expect(page.getByRole("heading", { name: /Страница не найдена/ })).toBeVisible();
  expect(state.reads).toEqual([]);
});

test("exact seven-field PUT, timezone instant round-trip, disable/re-enable, unchanged product fields", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL), original = structuredClone(state.products[0]);
  await open(page);
  await expect(page.getByRole("textbox", { name: "Начало (ISO 8601)", exact: true })).toHaveValue("2027-06-01T15:00:00+03:00");
  await page.getByRole("checkbox", { name: "Розыгрыш включён" }).uncheck();
  await rules(page).fill("  Новые правила  "); await save(page).click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible();
  expect(state.writes).toEqual([{ enabled: false, telegramUrl: "https://t.me/original", startAt: "2027-06-01T12:00:00.000Z", endAt: "2027-06-02T12:00:00.000Z", winnersCount: 2, rules: "Новые правила", homeText: "Исходный текст" }]);
  expect(state.products[0]).toMatchObject({ name: original.name, description: original.description, price: original.price, count: original.count, status: original.status, participantId: original.participantId });
  await page.getByRole("checkbox", { name: "Розыгрыш включён" }).check(); await save(page).click();
  await expect(save(page)).toBeEnabled(); expect(state.writes).toHaveLength(2); expect(state.writes[1].enabled).toBe(true);
  expect(state.admin.reads.filter(path => path.startsWith("/product/8101"))).toEqual([]);
});

test("past end permits disabling ended giveaway, but enabling and equal dates fail without PUT", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL);
  state.products[0] = adminGiveawayFixture(8101, { status: "TIME_EXPIRED", giveawayEndAt: "2027-06-01T11:00:00Z", giveawayStartAt: "2027-06-01T10:00:00Z" });
  await open(page); await save(page).click();
  await expect(page.getByText("Для включения окончание должно быть в будущем")).toBeVisible(); expect(state.writes).toEqual([]);
  await page.getByRole("checkbox", { name: "Розыгрыш включён" }).uncheck(); await save(page).click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible(); expect(state.writes).toHaveLength(1);
  await page.getByRole("textbox", { name: "Окончание (ISO 8601)", exact: true }).fill("2027-06-01T10:00:00Z"); await save(page).click();
  await expect(page.getByText("Окончание должно быть позже начала")).toBeVisible(); expect(state.writes).toHaveLength(1);
  for (const name of ["Продлить", "Восстановить", "Сохранить и восстановить"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
});

test("unsafe Telegram, blank text, fractional winners and missing timezone never PUT", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page);
  await page.getByRole("textbox", { name: "Telegram-ссылка", exact: true }).fill("https://t.me.evil.test/room");
  await rules(page).fill("   "); await page.getByRole("spinbutton", { name: "Число победителей" }).fill("1.5");
  await page.getByRole("textbox", { name: "Начало (ISO 8601)", exact: true }).fill("2027-06-01T15:00:00");
  await save(page).click(); await expect(page.getByText(/Укажите HTTPS-ссылку/)).toBeVisible();
  await expect(page.getByText("Заполните текст")).toBeVisible(); await expect(page.getByText("Введите положительное целое число")).toBeVisible();
  await expect(page.getByText("Укажите корректную дату ISO 8601 с часовым поясом")).toBeVisible(); expect(state.writes).toEqual([]);
});

for (const code of ["GIVEAWAY_WINDOW_OVERLAP", "INVALID_REQUEST"]) test(`400 ${code} retains input and is classified by code`, async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); state.writeStatus = 400; state.writeCode = code;
  await open(page); await rules(page).fill("Мой черновик"); await save(page).click();
  await expect(save(page)).toBeEnabled(); await expect(rules(page)).toHaveValue("Мой черновик");
  await expect(page.getByText(/Сервер отклонил настройки/)).toBeVisible();
  await expect(page.getByText("Проверьте даты: GIVEAWAY_WINDOW_OVERLAP")).toHaveCount(code === "GIVEAWAY_WINDOW_OVERLAP" ? 1 : 0);
  expect(state.writes).toHaveLength(1);
});

test("successful PUT + failed GET locks submit; retry only GET completes recovery", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page); state.failAfterWrite = true;
  await rules(page).fill("Сохранённый текст"); await save(page).click();
  await expect(page.getByText(/Результат требует проверки/)).toBeVisible(); await expect(save(page)).toBeDisabled();
  await expect(rules(page)).toHaveValue("Сохранённый текст"); expect(state.writes).toHaveLength(1);
  state.failAfterWrite = false; state.readStatus = 200; await check(page).click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible(); await expect(save(page)).toBeEnabled(); expect(state.writes).toHaveLength(1);
});

for (const applied of [false, true]) test(`lost PUT response applied=${applied}; recovery never repeats PUT`, async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); state.abort = true; state.applyOnAbort = applied;
  await open(page); await rules(page).fill("Неизвестная запись"); await save(page).click();
  if (applied) {
    await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible(); await expect(save(page)).toBeEnabled();
  } else {
    await expect(page.getByText(/Результат PUT пока неизвестен/)).toBeVisible(); await expect(save(page)).toBeDisabled();
    await check(page).click(); await expect(check(page)).toBeEnabled(); await expect(save(page)).toBeDisabled();
    state.products[0].giveawayRules = "Неизвестная запись";
    await check(page).click(); await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible();
  }
  expect(state.writes).toHaveLength(1);
});

test("pending PUT is shared across role unmount, forbids competing write and retains draft", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); const gate = deferred(); state.putGate = gate.promise;
  await open(page); await rules(page).fill("Незавершённая запись"); await save(page).dblclick();
  await expect.poll(() => state.writes.length).toBe(1); await expect(save(page)).toBeDisabled();
  state.admin.role = "USER"; await reconnect(page);
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  state.admin.role = "ADMIN"; await reconnect(page);
  await expect(rules(page)).toHaveValue("Незавершённая запись"); await expect(save(page)).toBeDisabled();
  gate.resolve(); await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible(); expect(state.writes).toHaveLength(1);
});

test("dirty background refresh preserves draft and requires explicit confirmed baseline reload", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page); await rules(page).fill("Локальный ввод");
  state.products[0].giveawayRules = "Другой администратор"; await check(page).click();
  await expect(save(page)).toBeDisabled(); await expect(rules(page)).toHaveValue("Локальный ввод");
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("button", { name: "Перечитать форму", exact: true }).click();
  await expect(rules(page)).toHaveValue("Локальный ввод"); await expect(save(page)).toBeDisabled();
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Перечитать форму", exact: true }).click();
  await expect(rules(page)).toHaveValue("Другой администратор"); await expect(save(page)).toBeEnabled(); expect(state.writes).toEqual([]);
});

test("preflight detects concurrent change before PUT; read error retains input until GET succeeds", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page); await rules(page).fill("Локальный ввод");
  state.readStatus = 500; await save(page).click(); await expect(page.getByText(/Запрос не отправлен/)).toBeVisible();
  await expect(save(page)).toBeDisabled(); await expect(rules(page)).toHaveValue("Локальный ввод"); expect(state.writes).toEqual([]);
  state.readStatus = 200; await check(page).click(); await expect(save(page)).toBeEnabled();
  state.products[0].giveawayHomeText = "Изменено в другой вкладке"; await save(page).click();
  await expect(page.getByText(/Настройки изменились на сервере/)).toBeVisible(); await expect(save(page)).toBeDisabled(); expect(state.writes).toEqual([]);
});

test("dirty navigation dismiss retains input; mobile fields and error text fit viewport", async ({ page, baseURL }) => {
  await setupAdminGiveaway(page, baseURL); await page.setViewportSize({ width: 393, height: 852 });
  await open(page); await rules(page).fill("Локальный ввод ".repeat(40));
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("link", { name: "← К истории розыгрышей" }).click();
  await expect(page).toHaveURL(/\/admin\/giveaways\/8101$/); await expect(rules(page)).toHaveValue("Локальный ввод ".repeat(40));
  await expectNoOverflow(page); await expect(page.getByText(/Часовой пояс задаётся/)).toBeVisible();
});

test("history error retries and disabled details ignore public 404", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); state.historyStatus = 500; state.products[0].giveawayEnabled = false;
  await page.route("**/giveaways/products/8101", route => fulfillJson(route, { message: "Недоступен" }, 404));
  await page.goto("/admin/giveaways"); await expect(page.getByText("История недоступна")).toBeVisible();
  state.historyStatus = 200; await page.getByRole("button", { name: "Обновить историю", exact: true }).click();
  await expect(page.getByRole("link", { name: "Настройки розыгрыша #8101", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Настройки розыгрыша #8101", exact: true }).click(); await expect(save(page)).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: "Розыгрыш включён" })).not.toBeChecked();
});

test("role revocation during preflight prevents PUT; draft survives reopening and late old GET", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page); await rules(page).fill("Черновик до смены роли");
  const started = deferred(), release = deferred(); let delayed = false;
  state.detailGate = async () => { if (!delayed) { delayed = true; started.resolve(); await release.promise; } };
  await save(page).click(); await started.promise;
  state.admin.role = "USER"; await reconnect(page);
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  state.products[0].giveawayHomeText = "Актуальный текст другого ADMIN";
  release.resolve();
  state.admin.role = "ADMIN"; await reconnect(page);
  await expect(rules(page)).toHaveValue("Черновик до смены роли");
  await expect(page.getByRole("textbox", { name: "Текст на главной", exact: true })).toHaveValue("Исходный текст");
  await expect(save(page)).toBeDisabled(); expect(state.writes).toEqual([]);
  await check(page).click(); await expect(check(page)).toBeEnabled();
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Перечитать форму", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Текст на главной", exact: true })).toHaveValue("Актуальный текст другого ADMIN");
  await expect(save(page)).toBeEnabled();
});

test("accepted PUT superseded by another ADMIN requires explicit reload, never replays old settings", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page); state.failAfterWrite = true;
  await rules(page).fill("Запись A"); await save(page).click(); await expect(page.getByText(/Результат требует проверки/)).toBeVisible();
  state.products[0].giveawayRules = "Запись B"; state.readStatus = 200; state.failAfterWrite = false;
  await check(page).click(); await expect(page.getByText(/PUT принят, но настройки уже изменены/)).toBeVisible();
  await expect(save(page)).toBeDisabled(); await expect(rules(page)).toHaveValue("Запись A"); expect(state.writes).toHaveLength(1);
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Перечитать форму", exact: true }).click();
  await expect(rules(page)).toHaveValue("Запись B"); await expect(save(page)).toBeEnabled(); expect(state.writes).toHaveLength(1);
});

test("end passing during preflight creates no unknown attempt and sends no PUT", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page); await rules(page).fill("Черновик у границы");
  const started = deferred(), release = deferred();
  state.detailGate = async () => { started.resolve(); await release.promise; };
  await save(page).click(); await started.promise;
  await page.clock.setFixedTime(new Date("2027-06-03T12:00:00Z")); release.resolve();
  await expect(page.getByText("Для включения окончание должно быть в будущем")).toBeVisible();
  await expect(save(page)).toBeEnabled(); await expect(rules(page)).toHaveValue("Черновик у границы"); expect(state.writes).toEqual([]);
});

test("sparse enabled is shown as unknown and blocks writing until fresh complete GET", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); state.products[0].giveawayEnabled = null;
  await page.goto("/admin/giveaways/8101"); await expect(page.getByText(/Включённость не подтверждена сервером/)).toBeVisible();
  await expect(save(page)).toBeDisabled(); expect(state.writes).toEqual([]);
  state.products[0].giveawayEnabled = false; await check(page).click(); await expect(save(page)).toBeEnabled();
  expect(state.writes).toEqual([]);
});

test("owner list outage after accepted PUT preserves recovery and retries only GET", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page); await rules(page).fill("Настройки при ошибке владельца");
  state.admin.agentsStatus = 500; await save(page).click();
  await expect(page.getByText(/Результат требует проверки/)).toBeVisible(); await expect(save(page)).toBeDisabled();
  expect(state.writes).toHaveLength(1); await expect(rules(page)).toHaveValue("Настройки при ошибке владельца");
  state.admin.agentsStatus = 200; await check(page).click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible(); await expect(save(page)).toBeEnabled(); expect(state.writes).toHaveLength(1);
});

test("HTTP 408 is an unknown result, not a confirmed rejection authorizing a second PUT", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL); await open(page); state.writeStatus = 408; state.writeCode = "REQUEST_TIMEOUT";
  await rules(page).fill("Запрос с timeout"); await save(page).click();
  await expect(page.getByText(/Результат PUT пока неизвестен/)).toBeVisible(); await expect(save(page)).toBeDisabled();
  await check(page).click(); await expect(check(page)).toBeEnabled(); await expect(save(page)).toBeDisabled(); expect(state.writes).toHaveLength(1);
  state.products[0].giveawayRules = "Запрос с timeout"; await check(page).click();
  await expect(page.getByText("Настройки сохранены и связанные данные обновлены.")).toBeVisible(); expect(state.writes).toHaveLength(1);
});

test("ordinary bot list/editor cannot extend or restore GIVEAWAY and do not call public product detail", async ({ page, baseURL }) => {
  const state = await setupAdminGiveaway(page, baseURL);
  Object.assign(state.admin.products[0], { id: 8101, availability: "GIVEAWAY" });
  await page.goto("/admin/products"); await expect(page.getByText("Фигурка дракона 101", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Заблокировать", exact: true })).toHaveCount(0);
  await page.goto("/admin/products/8101"); await expect(page.getByRole("textbox", { name: "Правила участия", exact: true })).toHaveValue("Исходные правила");
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Настройки розыгрыша", exact: true })).toHaveAttribute("href", "/admin/giveaways/8101");
  for (const name of ["Продлить", "Восстановить", "Сохранить и восстановить"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  expect(state.admin.reads.filter(path => path.startsWith("/product/8101"))).toEqual([]); expect(state.admin.writes).toEqual([]);
});
