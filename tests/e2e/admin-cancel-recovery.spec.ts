import { expect, test, type Page } from "@playwright/test";
import { adminOrderFixture, setupAdmin } from "./helpers/admin";
import { fulfillJson } from "./helpers/mobileAccount";

const reconnect = (page: Page) => page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
const openOrder = (page: Page, id = 201) => page.getByRole("button", { name: `Открыть заказ #${id}`, exact: true }).click();
const cancelDialog = (page: Page) => page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Отменить заказ", exact: true }) });
const openCancel = async (page: Page) => { await page.getByRole("button", { name: "Отменить заказ", exact: true }).click(); return cancelDialog(page); };
const roleCycle = async (page: Page, state: Awaited<ReturnType<typeof setupAdmin>>) => {
  state.role = "USER"; await reconnect(page);
  await expect(page.getByText("Доступ разрешён только администратору.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Отменить заказ", exact: true })).toHaveCount(0);
  state.role = "ADMIN"; await reconnect(page);
  await expect(page.getByRole("button", { name: "Открыть заказ #201", exact: true })).toBeVisible();
};

test("CANCEL loss + GET BOOKED + USER → ADMIN retains recovery and comment without a second POST", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.actionAbort = true; state.actionStatus = 500;
  await page.goto("/admin/orders?status=all"); await openOrder(page);
  let dialog = await openCancel(page);
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Не повторять административную отмену");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  expect(state.orders[0].actualStatus).toBe("BOOKED");
  const oldForm = await dialog.locator("form").elementHandle();
  await roleCycle(page, state);
  expect(await oldForm!.evaluate(form => form.isConnected)).toBe(false);
  await openOrder(page);
  await expect(page.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  dialog = await openCancel(page);
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Не повторять административную отмену");
  const submit = dialog.getByRole("button", { name: "Отменить заказ", exact: true });
  await expect(submit).toBeDisabled(); await submit.dispatchEvent("click");
  await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  expect(state.writes).toHaveLength(1);
  state.orders[0].actualStatus = "CANCELLED";
  await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Детали заказа", exact: true }).getByText("Отменён", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1); await oldForm!.dispose();
});

for (const outcome of ["lost", "accepted"] as const) test(`pending CANCEL survives USER → ADMIN and blocks another POST before late ${outcome}`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const rolesAtPost: string[] = [];
  await page.route("**/admin/actions/agents/2/orders/201/CANCEL*", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    rolesAtPost.push(state.role); await gate;
    if (outcome === "lost") await route.abort("connectionfailed");
    else { state.orders[0].actualStatus = "CANCELLED"; await fulfillJson(route, 201); }
  });
  await page.goto("/admin/orders?status=all"); await openOrder(page);
  const dialog = await openCancel(page);
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Запрос ещё выполняется");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  try {
    await expect.poll(() => rolesAtPost.length).toBe(1);
    await roleCycle(page, state); await openOrder(page);
    await expect(page.getByText("Отмена заказа выполняется. Повторная отправка заблокирована.", { exact: true })).toBeVisible();
    const button = page.getByRole("button", { name: "Отменить заказ", exact: true });
    await expect(button).toBeDisabled(); await button.dispatchEvent("click");
    expect(rolesAtPost).toEqual(["ADMIN"]);
  } finally { release(); }
  if (outcome === "lost") {
    await expect(page.getByText(/Операция могла выполниться/)).toBeVisible();
    const restored = await openCancel(page);
    await expect(restored.getByLabel("Комментарий", { exact: true })).toHaveValue("Запрос ещё выполняется");
    await expect(restored.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
    await restored.getByRole("button", { name: "Проверить результат", exact: true }).click();
    await expect(restored.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  } else {
    await expect(page.getByText("Действие принято сервером", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Обновить список", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Детали заказа", exact: true }).getByText("Отменён", { exact: true })).toBeVisible();
  }
  expect(rolesAtPost).toEqual(["ADMIN"]);
});

test("CANCEL finishing while role is USER records recovery without starting another admin request", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let posts = 0;
  const readsWhileUser: string[] = [];
  page.on("request", request => { if (state.role === "USER" && request.method() === "GET" && request.url().includes("/admin/actions/")) readsWhileUser.push(request.url()); });
  await page.route("**/admin/actions/agents/2/orders/201/CANCEL*", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    posts++; await gate; await route.abort("connectionfailed");
  });
  await page.goto("/admin/orders?status=all"); await openOrder(page);
  const dialog = await openCancel(page);
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect.poll(() => posts).toBe(1);
  state.role = "USER"; await reconnect(page);
  await expect(page.getByText("Доступ разрешён только администратору.", { exact: true })).toBeVisible();
  // Считаем новые чтения после подтверждённого отзыва, без начатого ранее reconnect.
  readsWhileUser.length = 0;
  const failed = page.waitForEvent("requestfailed", { predicate: request => request.url().includes("/orders/201/CANCEL") });
  release(); await failed;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(readsWhileUser).toEqual([]);
  state.role = "ADMIN"; await reconnect(page);
  await expect(page.getByRole("button", { name: "Открыть заказ #201", exact: true })).toBeVisible();
  await openOrder(page);
  await expect(page.getByRole("button", { name: "Проверить результат", exact: true })).toBeVisible();
  expect(posts).toBe(1); expect(readsWhileUser).toEqual([]);
});

test("confirmed CANCEL rejection survives the role cycle and permits a deliberate retry", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.actionStatus = 409;
  await page.goto("/admin/orders?status=all"); await openOrder(page);
  let dialog = await openCancel(page);
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Причина отклонённой отмены");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText("Действие отклонено", { exact: true })).toBeVisible();
  await roleCycle(page, state); await openOrder(page); dialog = await openCancel(page);
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Причина отклонённой отмены");
  await expect(dialog.getByText("Действие отклонено", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  state.actionStatus = 200;
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden(); expect(state.writes).toHaveLength(2);
  expect(state.writes[0]).toEqual(state.writes[1]);
});

test("CANCEL recovery is isolated from another order and restored on returning", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.orders = [adminOrderFixture(201), adminOrderFixture(202)]; state.actionAbort = true; state.actionStatus = 500;
  await page.goto("/admin/orders?status=all"); await openOrder(page);
  let dialog = await openCancel(page);
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  await roleCycle(page, state); await openOrder(page, 202); dialog = await openCancel(page);
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeEnabled();
  await expect(dialog.getByText(/Операция могла выполниться/)).toHaveCount(0);
  state.actionAbort = false; state.actionStatus = 200;
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("dialog", { name: "Детали заказа", exact: true }).getByRole("button", { name: "Закрыть", exact: true }).click();
  await openOrder(page, 201); dialog = await openCancel(page);
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  expect(state.writes.map(item => item.path)).toEqual(["/admin/actions/agents/2/orders/201/CANCEL", "/admin/actions/agents/2/orders/202/CANCEL"]);
});
