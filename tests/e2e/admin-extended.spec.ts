import { expect, test } from "@playwright/test";
import { adminOrderFixture, setupAdmin } from "./helpers/admin";
import { expectNoOverflow, png } from "./helpers/mobileAccount";

for (const scenario of [
  { status: "AWAITING_PREPAYMENT_APPROVAL", action: "CONFIRM_PREPAYMENT", label: "Подтвердить предоплату" },
  { status: "ASSEMBLING", action: "SHIP", label: "Отправить" },
  { status: "AWAITING_PAYMENT", action: "CANCEL", label: "Отменить заказ" },
]) test(`admin order ${scenario.action} uses correct endpoint`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.orders = [adminOrderFixture(201, scenario.status)];
  await page.goto(`/admin/orders?status=${scenario.status}`);
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: scenario.label, exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: scenario.label, exact: true }) });
  if (scenario.action === "SHIP") await dialog.getByLabel("Ссылка доставки", { exact: true }).fill("https://example.com/track/201");
  if (scenario.action === "CANCEL") await expect(dialog.getByText(/не подтверждает возврат денег/)).toBeVisible();
  await dialog.getByRole("button", { name: scenario.label, exact: true }).click();
  await expect(page.getByText(/заказ больше не входит/)).toBeVisible();
  expect(state.writes.map((item) => item.path)).toEqual([`/admin/actions/agents/2/orders/201/${scenario.action}`]);
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
