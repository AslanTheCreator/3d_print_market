import { expect, test, type Locator, type Page } from "@playwright/test";
import { setupAdmin } from "./helpers/admin";
import { fulfillJson } from "./helpers/mobileAccount";

const cancelDialog = (page: Page) => page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Отменить заказ", exact: true }) });
const details = (page: Page) => page.getByRole("dialog", { name: "Детали заказа", exact: true });
const openCancel = async (page: Page) => {
  await page.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  return cancelDialog(page);
};
const closeCancel = async (page: Page, dialog: Locator, method: "button" | "Escape") => {
  if (method === "button") await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  else await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(details(page)).toBeVisible();
};

for (const method of ["button", "Escape"] as const) test(`unknown CANCEL closes via ${method}, reopens with guard, and allows fresh CONFIRM without remount`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.actionAbort = true; state.actionStatus = 500;
  const requests: { method: string; path: string }[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (request.method() !== "OPTIONS" && path.startsWith("/admin/actions/agents/2/orders")) requests.push({ method: request.method(), path });
  });
  const prompts: string[] = [];
  page.on("dialog", async prompt => { prompts.push(prompt.message()); await prompt.dismiss(); });
  await page.goto("/admin/orders?status=all");
  await page.getByRole("button", { name: "Открыть заказ #201", exact: true }).click();
  const originalDetails = await details(page).elementHandle();
  let dialog = await openCancel(page);
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Сохранить отмену после закрытия");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Закрыть", exact: true })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  expect(state.orders[0].actualStatus).toBe("BOOKED");
  await closeCancel(page, dialog, method);
  expect(await originalDetails!.evaluate(node => node.isConnected)).toBe(true);
  await expect(details(page).getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  await expect(details(page).getByRole("button", { name: "Подтвердить заказ", exact: true })).toBeEnabled();

  // Повторное открытие и GET BOOKED сохраняют unknown, комментарий и запрет второго POST.
  dialog = await openCancel(page);
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Сохранить отмену после закрытия");
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toBeDisabled();
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).dispatchEvent("click");
  const readsBeforeCheck = requests.filter(request => request.method === "GET").length;
  const checked = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === "/admin/actions/agents/2/orders");
  await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await checked;
  await expect(dialog.getByRole("button", { name: "Проверить результат", exact: true })).toBeEnabled();
  expect(requests.filter(request => request.method === "GET").length).toBe(readsBeforeCheck + 1);
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  await closeCancel(page, dialog, method);
  expect(await originalDetails!.evaluate(node => node.isConnected)).toBe(true);
  expect(state.role).toBe("ADMIN"); expect(prompts).toEqual([]); expect(state.writes).toHaveLength(1);

  await details(page).getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  const confirmation = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Подтвердить заказ", exact: true }) });
  await confirmation.getByLabel("Комментарий", { exact: true }).fill("Самостоятельный CONFIRM");
  state.actionAbort = false; state.actionStatus = 200;
  const beforeConfirm = requests.length;
  await confirmation.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  await expect(confirmation).toBeHidden();
  expect(requests.slice(beforeConfirm, beforeConfirm + 2)).toEqual([
    { method: "GET", path: "/admin/actions/agents/2/orders" },
    { method: "POST", path: "/admin/actions/agents/2/orders/201/CONFIRM" },
  ]);
  expect(state.writes.map(write => write.path)).toEqual(["/admin/actions/agents/2/orders/201/CANCEL", "/admin/actions/agents/2/orders/201/CONFIRM"]);
  expect([...new URLSearchParams(state.writes[1].search)]).toEqual([["comment", "Самостоятельный CONFIRM"]]);
  expect(state.orders[0].actualStatus).toBe("AWAITING_PREPAYMENT");
  await originalDetails!.dispose();
});

test("pending CANCEL cannot close via button or Escape and still blocks CONFIRM", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let posts = 0;
  await page.route("**/admin/actions/agents/2/orders/201/CANCEL*", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    posts++; await gate; await route.abort("connectionfailed");
  });
  await page.goto("/admin/orders?status=all");
  await page.getByRole("button", { name: "Открыть заказ #201", exact: true }).click();
  const dialog = await openCancel(page);
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Ожидающий CANCEL");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  try {
    await expect.poll(() => posts).toBe(1);
    const close = dialog.getByRole("button", { name: "Закрыть", exact: true });
    await expect(close).toBeDisabled(); await close.dispatchEvent("click");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape"); await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Подтвердить заказ", exact: true, includeHidden: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
    expect(posts).toBe(1); expect(state.writes).toEqual([]);
  } finally { release(); }
  await expect(dialog.getByText(/Изменение статуса не подтверждено/)).toBeVisible();
  await closeCancel(page, dialog, "button");
  await expect(details(page).getByRole("button", { name: "Подтвердить заказ", exact: true })).toBeEnabled();
  expect(posts).toBe(1);
});

for (const method of ["button", "Escape"] as const) test(`accepted CANCEL closes via ${method} after failed refresh without losing its guard`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.failOrderReadAfterAction = true;
  await page.goto("/admin/orders?status=all");
  await page.getByRole("button", { name: "Открыть заказ #201", exact: true }).click();
  const dialog = await openCancel(page);
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Принятый CANCEL");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText(/Действие выполнено/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  await closeCancel(page, dialog, method);
  const cancel = details(page).getByRole("button", { name: "Отменить заказ", exact: true });
  await expect(cancel).toBeDisabled(); await cancel.dispatchEvent("click");
  await expect(dialog).toBeHidden(); expect(state.writes).toHaveLength(1);
  state.orderReadStatus = 200;
  await details(page).getByRole("button", { name: "Обновить список", exact: true }).click();
  await expect(details(page).getByText("Отменён", { exact: true })).toBeVisible();
  await expect(details(page).getByRole("button", { name: /Отменить заказ|Подтвердить|Отправить/ })).toHaveCount(0);
});

for (const method of ["button", "Escape"] as const) test(`rejected CANCEL closes via ${method}, restores comment and permits a deliberate retry`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.actionStatus = 409;
  await page.goto("/admin/orders?status=all");
  await page.getByRole("button", { name: "Открыть заказ #201", exact: true }).click();
  let dialog = await openCancel(page);
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Отклонённый CANCEL");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText("Действие отклонено", { exact: true })).toBeVisible();
  page.once("dialog", prompt => prompt.accept());
  await closeCancel(page, dialog, method);
  expect(state.writes).toHaveLength(1);
  dialog = await openCancel(page);
  await expect(dialog.getByLabel("Комментарий", { exact: true })).toHaveValue("Отклонённый CANCEL");
  await expect(dialog.getByText("Действие отклонено", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeEnabled();
  state.actionStatus = 200;
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden(); expect(state.writes).toHaveLength(2);
  expect(state.writes[0]).toEqual(state.writes[1]);
});
