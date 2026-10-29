import { expect, test, type Page } from "@playwright/test";
import { adminOrderFixture, setupAdmin } from "./helpers/admin";
import { expectNoOverflow, fulfillJson, png } from "./helpers/mobileAccount";
import { fillConversion, setupGiveawayConversion, botGiveawayFixture } from "./helpers/adminGiveawayConversion";

for (const code of ["GIVEAWAY_WINDOW_OVERLAP", "INVALID_REQUEST"]) test(`conversion rejects ${code} without losing input or relationships`, async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL); await page.goto("/admin/products/101");
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeEnabled(); await fillConversion(page);
  state.writeStatus = 400; state.writeCode = code; await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Сервер отклонил товар", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Правила участия", exact: true })).toHaveValue("Правила бота");
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeEnabled();
  await expect(page.getByText("Период пересекается с другим включённым розыгрышем").first()).toHaveCount(code === "GIVEAWAY_WINDOW_OVERLAP" ? 1 : 0);
  state.writeStatus = 200; await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(2); expect(state.writes[1].body).toMatchObject({ categoryIds: [1, 2], imageIds: [77, 78] });
});

for (const defect of ["relations", "owner", "type", "USER"]) test(`conversion blocks unconfirmed ${defect} before any PUT`, async ({ page, baseURL }) => {
  const state = await setupGiveawayConversion(page, baseURL, defect === "USER" ? "USER" : "ADMIN");
  if (defect === "relations") { state.product = botGiveawayFixture(); state.imageIds = null; }
  if (defect === "owner") state.product.participantId = 99;
  if (defect === "type") state.product.availability = "PURCHASABLE";
  await page.goto("/admin/products/101");
  const text = defect === "relations" ? /Сохранение заблокировано/ : defect === "owner" ? /Владелец не входит/ : defect === "type" ? /Этот тип товара недоступен/ : /Доступ разрешён только администратору/;
  await expect(page.getByText(text).first()).toBeVisible(); await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]); if (defect === "relations") expect(state.reads).not.toContain("/product/101"); if (defect === "USER") expect(state.reads).toEqual([]);
});

const nonBookedStatuses = ["AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY", "DISPUTED", "COMPLETED", "CANCELLED", "FAILED"] as const;
const openAdminCancel = async (page: Page) => {
  await page.goto("/admin/orders?status=all");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  return page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Отменить заказ", exact: true }) });
};

for (const status of nonBookedStatuses) {
  test(`B4: ADMIN CANCEL is absent for ${status}; other ADMIN actions retain their matrix`, async ({ page, baseURL }) => {
    const state = await setupAdmin(page, baseURL);
    state.orders = [adminOrderFixture(201, status)];
    await page.goto(`/admin/orders?status=${status}`);
    await page.getByRole("button", { name: "Открыть заказ #201" }).click();
    const detail = page.getByRole("dialog", { name: "Детали заказа", exact: true });
    await expect(detail.getByRole("button", { name: "Отменить заказ", exact: true })).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "Подтвердить заказ", exact: true })).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "Подтвердить предоплату", exact: true })).toHaveCount(status === "AWAITING_PREPAYMENT_APPROVAL" ? 1 : 0);
    await expect(detail.getByRole("button", { name: "Отправить", exact: true })).toHaveCount(status === "ASSEMBLING" ? 1 : 0);
    expect(state.writes).toEqual([]);
  });

  test(`B4: changing BOOKED to ${status} with CANCEL dialog open prevents POST`, async ({ page, baseURL }) => {
    const state = await setupAdmin(page, baseURL);
    const dialog = await openAdminCancel(page);
    await dialog.getByLabel("Комментарий", { exact: true }).fill("Причина остаётся в форме");
    state.orders[0].actualStatus = status;
    await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
    await expect(dialog.getByText(/Статус или владелец заказа изменился/)).toBeVisible();
    await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Причина остаётся в форме");
    expect(state.reads).toContain("/admin/actions/agents/2/orders?page=0&size=50");
    expect(state.writes).toEqual([]);
  });
}

for (const change of ["owner", "missing"] as const) test(`B4: ${change} order prevents CANCEL POST`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const dialog = await openAdminCancel(page);
  if (change === "owner") state.orders[0].sellerId = 3;
  else state.orders = [];
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText(/Статус или владелец заказа изменился/)).toBeVisible();
  expect(state.writes).toEqual([]);
});

for (const status of [403, 500]) test(`B4: failed pre-submit GET ${status} keeps input and permits only an explicit new attempt`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const dialog = await openAdminCancel(page);
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Не терять причину");
  state.orderReadStatus = status;
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText("Список заказов недоступен", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Не терять причину");
  await expect(dialog.getByText(/Операция могла выполниться/)).toHaveCount(0);
  expect(state.writes).toEqual([]);
  state.orderReadStatus = 200;
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(state.writes).toHaveLength(1);
  expect(state.orders[0].actualStatus).toBe("CANCELLED");
});

test("B4: logout during pre-submit GET prevents a late CANCEL POST", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const dialog = await openAdminCancel(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false, completed = false;
  await page.route("**/admin/actions/agents/2/orders?*", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    started = true; await gate;
    await fulfillJson(route, state.orders).catch(() => {}); completed = true;
  });
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  try {
    await expect.poll(() => started).toBe(true);
    page.on("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Выйти", exact: true, includeHidden: true }).evaluate(button => (button as HTMLButtonElement).click());
    await expect(page).toHaveURL(/auth\/login/);
  } finally { release(); }
  await expect.poll(() => completed).toBe(true);
  expect(state.writes).toEqual([]);
});

test("B4: access verification failure during pre-submit GET prevents CANCEL POST", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const dialog = await openAdminCancel(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false, completed = false;
  await page.route("**/admin/actions/agents/2/orders?*", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    started = true; await gate;
    await fulfillJson(route, state.orders); completed = true;
  });
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Сохранить при проверке доступа");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  try {
    await expect.poll(() => started).toBe(true);
    state.profileStatus = 500;
    await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
    await expect(page.getByRole("heading", { name: "Не удалось проверить доступ", exact: true })).toBeVisible();
  } finally { release(); }
  await expect.poll(() => completed).toBe(true);
  const retainedDialog = page.getByRole("dialog", { includeHidden: true }).filter({ has: page.getByRole("heading", { name: "Отменить заказ", exact: true, includeHidden: true }) });
  await expect(retainedDialog.getByText("Доступ администратора не подтверждён. Повторите проверку доступа.", { exact: true })).toHaveCount(1);
  state.profileStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(dialog.getByText("Доступ администратора не подтверждён. Повторите проверку доступа.", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Сохранить при проверке доступа");
  expect(state.writes).toEqual([]);
});

for (const scenario of [
  { status: "BOOKED", action: "CONFIRM", label: "Подтвердить заказ" },
  { status: "AWAITING_PREPAYMENT_APPROVAL", action: "CONFIRM_PREPAYMENT", label: "Подтвердить предоплату" },
  { status: "ASSEMBLING", action: "SHIP", label: "Отправить" },
  { status: "BOOKED", action: "CANCEL", label: "Отменить заказ" },
]) test(`admin order ${scenario.action} uses correct endpoint`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.orders = [adminOrderFixture(201, scenario.status)];
  const userWrites: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname.startsWith("/order/")) userWrites.push(request.url()); });
  await page.goto(`/admin/orders?status=${scenario.status}`);
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: scenario.label, exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: scenario.label, exact: true }) });
  if (scenario.action === "SHIP") await dialog.getByLabel("Ссылка доставки", { exact: true }).fill("https://example.com/track/201");
  if (scenario.action === "CANCEL") await expect(dialog.getByText(/не подтверждает возврат денег/)).toBeVisible();
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Комментарий & проверка");
  await dialog.getByRole("button", { name: scenario.label, exact: true }).click();
  await expect(page.getByText(/заказ больше не входит/)).toBeVisible();
  expect(state.writes.map((item) => item.path)).toEqual([`/admin/actions/agents/2/orders/201/${scenario.action}`]);
  expect(state.writes[0].body).toBeNull();
  const params = new URLSearchParams(state.writes[0].search);
  expect(params.get("comment")).toBe("Комментарий & проверка");
  expect(params.get("deliveryUrl")).toBe(scenario.action === "SHIP" ? "https://example.com/track/201" : null);
  expect(userWrites).toEqual([]);
});

for (const status of [403, 500]) test(`admin action error ${status} preserves comment`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.actionStatus = status;
  await page.goto("/admin/orders"); await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Подтвердить заказ", exact: true }) });
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Не терять введённое");
  await dialog.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  await expect(dialog.getByText("Действие отклонено")).toBeVisible();
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Не терять введённое");
  expect(state.writes).toHaveLength(1);
});

test("unresolved outcome blocks repeated POST and uses paginated reconciliation", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.actionAbort = true; state.actionStatus = 500;
  state.orders = [...Array.from({ length: 50 }, (_, index) => adminOrderFixture(index + 300, "COMPLETED")), adminOrderFixture()];
  await page.goto("/admin/orders"); await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Подтвердить заказ", exact: true }) });
  await dialog.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Подтвердить заказ", exact: true })).toBeDisabled();
  expect(state.reads).toContain("/admin/actions/agents/2/orders?page=1&size=50");
  await dialog.getByRole("button", { name: "Проверить результат" }).click();
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  expect(state.writes).toHaveLength(1);
});

for (const status of [403, 409, 500]) test(`ADMIN CANCEL from BOOKED preserves input after ${status}`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.orders = [adminOrderFixture(201, "BOOKED")];
  state.actionStatus = status;
  await page.goto("/admin/orders?status=BOOKED");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Отменить заказ", exact: true }) });
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Комментарий отмены");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText("Действие отклонено", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Комментарий отмены");
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]).toMatchObject({ path: "/admin/actions/agents/2/orders/201/CANCEL", method: "POST", body: null });
  expect([...new URLSearchParams(state.writes[0].search)]).toEqual([["comment", "Комментарий отмены"]]);
});

for (const applied of [false, true]) test(`ADMIN CANCEL lost response applied=${applied} reads actual server status`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.orders = [adminOrderFixture(201, "BOOKED")];
  state.actionAbort = true; state.actionStatus = 500; state.applyBeforeAbort = applied;
  await page.goto("/admin/orders?status=all");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Отменить заказ", exact: true }) });
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Не повторять отмену");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  if (applied) {
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("dialog", { name: "Детали заказа", exact: true }).getByText("Отменён", { exact: true })).toBeVisible();
  } else {
    await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
    await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Не повторять отмену");
    await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
    await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
    await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  }
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].path).toBe("/admin/actions/agents/2/orders/201/CANCEL");
  expect(state.reads).toContain("/admin/actions/agents/2/orders?page=0&size=50");
});

test("ADMIN CANCEL does not coerce an unexpected reconciled status to CANCELLED", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const dialog = await openAdminCancel(page);
  await page.route("**/admin/actions/agents/2/orders/201/CANCEL*", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    state.writes.push({ path: new URL(route.request().url()).pathname, method: "POST", body: null, search: new URL(route.request().url()).search });
    // Mock намеренно вернул FAILED: клиент не подменяет его на CANCELLED по имени CANCEL.
    state.orders[0].actualStatus = "FAILED";
    return route.abort("connectionfailed");
  });
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Детали заказа", exact: true }).getByText("Спор решён в пользу покупателя", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
});

test("ADMIN cancelled filter exposes server CANCELLED without ordinary actions", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.orders = [adminOrderFixture(201, "CANCELLED")];
  await page.goto("/admin/orders?status=CANCELLED");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  const detail = page.getByRole("dialog", { name: "Детали заказа", exact: true });
  await expect(detail.getByText("Отменён", { exact: true })).toBeVisible();
  await expect(detail.getByRole("button", { name: /Отменить заказ|Подтвердить|Отправить/ })).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
});

test("ordinary users cannot invoke ADMIN CANCEL", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL, "USER");
  await page.goto("/admin/orders?status=AWAITING_PAYMENT");
  await expect(page.getByText("Доступ разрешён только администратору.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Отменить заказ", exact: true })).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
});

test("orders pagination accepts an empty next page and returns", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.orders = Array.from({ length: 50 }, (_, index) => adminOrderFixture(index + 1));
  await page.goto("/admin/orders"); await page.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(page.getByText(/На этой странице заказов нет/)).toBeVisible();
  await expect(page).toHaveURL(/page=1/);
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.getByRole("button", { name: "Открыть заказ #1", exact: true })).toBeVisible();
});

test("image changes update IDs without deleting old files, URL is required", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const deletes: string[] = [];
  page.on("request", (request) => { if (request.method() === "DELETE") deletes.push(request.url()); });
  await page.goto("/admin/products/101");
  await page.getByLabel("Внешняя ссылка", { exact: true }).fill("");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Укажите внешнюю ссылку")).toBeVisible(); expect(state.writes).toHaveLength(0);
  await page.getByLabel("Внешняя ссылка", { exact: true }).fill("https://t.me/example/456");
  await page.getByRole("button", { name: "Убрать фото #77" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "new.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByRole("button", { name: "Убрать фото #88" })).toBeVisible();
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes[0].body?.imageIds).toEqual([88]); expect(deletes).toEqual([]);
});

test("profile exact payload, dirty navigation and mobile input preservation", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  await page.goto("/admin/agents/2?tab=settings");
  await page.getByLabel("Имя продавца", { exact: true }).fill("Новый продавец");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("tab", { name: "Товары", exact: true }).click();
  await expect(page).toHaveURL(/tab=settings/);
  await page.setViewportSize({ width: 393, height: 727 });
  await expect(page.getByLabel("Имя продавца", { exact: true })).toHaveValue("Новый продавец");
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Сохранить профиль", exact: true }).click();
  await expect(page.getByText("Профиль сохранён", { exact: true })).toBeVisible();
  expect(state.writes[0].body).toEqual({ fullName: "Новый продавец", phoneNumber: "", deadlineSending: 1, deadlinePayment: 2, imageId: null });
});

test("contacts CRUD only writes the selected bot and refreshes records", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  await page.goto("/admin/agents/2?tab=settings");
  const section = page.locator(".MuiPaper-root").filter({ has: page.getByRole("heading", { name: "Контакты", exact: true }) });
  await section.getByRole("button", { name: "Добавить запись", exact: true }).click();
  await section.getByLabel("Контакт", { exact: true }).fill("@first");
  await section.getByRole("button", { name: "Сохранить запись", exact: true }).click();
  await expect(section.getByText("Telegram: @first", { exact: true })).toBeVisible();
  await section.getByRole("button", { name: "Изменить", exact: true }).click();
  await section.getByLabel("Контакт", { exact: true }).fill("@updated");
  await section.getByRole("button", { name: "Сохранить запись", exact: true }).click();
  await expect(section.getByText("Telegram: @updated", { exact: true })).toBeVisible();
  await section.getByRole("button", { name: "Удалить", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(section.getByText("Записей пока нет", { exact: true })).toBeVisible();
  expect(state.writes.map(({ path, method }) => ({ path, method }))).toEqual([
    { path: "/admin/actions/agents/2/social-networks", method: "POST" },
    { path: "/admin/actions/agents/2/social-networks/100", method: "PUT" },
    { path: "/admin/actions/agents/2/social-networks/100", method: "DELETE" },
  ]);
});

test("admin layout screenshots and keyboard navigation", async ({ page, baseURL }, testInfo) => {
  await setupAdmin(page, baseURL);
  for (const section of ["orders", "products", "agents"]) {
    await page.setViewportSize({ width: 1376, height: 900 }); await page.goto(`/admin/${section}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${section}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 393, height: 727 });
    await expectNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${section}-mobile.png`), fullPage: true });
    const menu = page.getByRole("button", { name: "Открыть меню админки" });
    await menu.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: "Товары", exact: true })).toBeVisible();
    await page.keyboard.press("Escape"); await expect(menu).toBeFocused();
  }
});

test("lost create response reconciles new record without a second POST", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.recordAbort = true;
  await page.goto("/admin/agents/2?tab=settings");
  const section = page.locator(".MuiPaper-root").filter({ has: page.getByRole("heading", { name: "Контакты", exact: true }) });
  await section.getByRole("button", { name: "Добавить запись", exact: true }).click();
  await section.getByLabel("Контакт", { exact: true }).fill("@new-contact");
  await section.getByRole("button", { name: "Сохранить запись", exact: true }).click();
  await expect(section.getByText("Изменение сохранено.", { exact: true })).toBeVisible();
  await expect(section.getByText("Telegram: @new-contact", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
});

test("expired admin profile clears access and preserves login return URL", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.profileStatus = 401;
  await page.goto("/admin/products?agent=2");
  await expect(page).toHaveURL(/\/auth\/login\?redirect=/);
  expect(new URL(page.url()).searchParams.get("redirect")).toBe("/admin/products?agent=2");
  expect(state.reads.filter((path) => path.startsWith("/admin/"))).toEqual([]);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "access_token")).toBeFalsy();
});

test("successful action followed by failed read cannot reopen stale actions", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.failOrderReadAfterAction = true;
  await page.goto("/admin/orders"); await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Подтвердить заказ", exact: true }) });
  await dialog.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  await expect(dialog.getByText(/Действие выполнено/)).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(dialog).toBeHidden();
  const details = page.getByRole("dialog", { name: "Детали заказа", exact: true });
  await details.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(details).toBeHidden();
  await expect(page.getByRole("button", { name: "Открыть заказ #201" })).toBeDisabled();
  state.orderReadStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByText("Заказов с выбранными фильтрами нет", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
});
