import { expect, test, type Locator } from "@playwright/test";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

const expectRecovery = async (dialog: Locator) => {
  await expect(dialog.getByText(/Результат отмены не подтверждён/)).toBeVisible();
  await expect(dialog.getByLabel("Причина отмены")).toHaveValue("Сохранённая причина");
  await expect(dialog.getByLabel("Дополнительный комментарий (необязательно)")).toHaveValue("Пояснение покупателя или продавца");
  const submit = dialog.getByRole("button", { name: "Отменить заказ", exact: true });
  await expect(submit).toBeDisabled();
  // Синтетический click также не должен отправлять POST.
  await submit.dispatchEvent("click");
};

for (const role of ["purchase", "sales"] as const) test(`${role}: lost cancellation + GET BOOKED survives ${role === "purchase" ? "filter remount" : "another cancellation button"}`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  const orders = [orderFixture(1, "BOOKED", 1)];
  state[role === "purchase" ? "customerOrders" : "sellerOrders"] = orders;
  let writes = 0;
  await page.route("**/order/1/CANCELLED", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++;
    return route.abort("connectionfailed");
  });
  await page.goto(`/dashboard/${role}`);
  const desktop = page.getByTestId("desktop-orders");
  const buttons = desktop.getByRole("button", { name: "Отменить", exact: true });
  await buttons.first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Сохранённая причина");
  await dialog.getByLabel("Дополнительный комментарий (необязательно)").fill("Пояснение покупателя или продавца");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expectRecovery(dialog);
  expect(state.ordersReads).toBeGreaterThanOrEqual(2);
  expect(orders[0].actualStatus).toBe("BOOKED");
  await dialog.getByRole("button", { name: "Закрыть окно отмены заказа", exact: true }).click();
  await expect(dialog).toBeHidden();
  if (role === "purchase") {
    await desktop.getByRole("button", { name: /Завершены/ }).click();
    await expect(buttons).toHaveCount(0);
    await desktop.getByRole("button", { name: /^Все/ }).click();
    await buttons.first().click();
  } else {
    await expect(buttons).toHaveCount(2);
    await buttons.nth(1).click();
  }
  await expectRecovery(dialog);
  await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await expectRecovery(dialog);
  expect(writes).toBe(1);
  orders[0].actualStatus = "CANCELLED";
  await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(writes).toBe(1);
});

test("pending cancellation survives form unmount, blocks the replacement, and settles after the lost response", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let writes = 0;
  await page.route("**/order/1/CANCELLED", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++; await gate;
    await route.abort("connectionfailed");
  });
  await page.goto("/dashboard/purchase");
  const desktop = page.getByTestId("desktop-orders");
  await desktop.getByRole("button", { name: "Отменить", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Сохранённая причина");
  await dialog.getByLabel("Дополнительный комментарий (необязательно)").fill("Пояснение покупателя или продавца");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  try {
    await expect.poll(() => writes).toBe(1);
    // Вынужденный unmount владельца диалога при ещё выполняющемся POST.
    await desktop.getByRole("button", { name: /Завершены/, includeHidden: true }).evaluate(button => (button as HTMLButtonElement).click());
    await expect(dialog).toBeHidden();
    await desktop.getByRole("button", { name: /^Все/ }).click();
    await desktop.getByRole("button", { name: "Отменить", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Отмена...", exact: true })).toBeDisabled();
  } finally { release(); }
  await expectRecovery(dialog);
  expect(writes).toBe(1);
});

test("another order has an independent cancellation; returning to the first retains recovery", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 393, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "BOOKED", 1), orderFixture(2, "BOOKED", 2)];
  const writes: number[] = [];
  await page.route("**/order/*/CANCELLED", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    const id = Number(new URL(route.request().url()).pathname.split("/")[2]);
    writes.push(id);
    if (id === 1) return route.abort("connectionfailed");
    state.customerOrders[1].actualStatus = "CANCELLED";
    return fulfillJson(route, 1);
  });
  await page.goto("/dashboard/purchase");
  const open = (id: number) => page.getByRole("article", { name: `Заказ №${id}`, exact: true }).getByRole("button", { name: "Отменить", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await open(1);
  await dialog.getByLabel("Причина отмены").fill("Сохранённая причина");
  await dialog.getByLabel("Дополнительный комментарий (необязательно)").fill("Пояснение покупателя или продавца");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expectRecovery(dialog);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await open(2);
  await expect(dialog.getByLabel("Причина отмены")).toHaveValue("");
  await expect(dialog.getByText(/Результат отмены не подтверждён/)).toHaveCount(0);
  await dialog.getByLabel("Причина отмены").fill("Причина другого заказа");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden();
  await open(1);
  await expectRecovery(dialog);
  expect(writes).toEqual([1, 2]);
});

for (const response of ["lost", "late success", "late loss"] as const) test(`logout/login isolates cancellation and private input after ${response}`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  let writes = 0, owner = 1, completed = false;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  for (const path of ["/auth/profile", "/participant"]) await page.route(`http://127.0.0.1:9${path}`, route => fulfillJson(route, {
    id: owner, login: `account-${owner}`, fullName: `Account ${owner}`, role: "USER", mail: "fixture@example.test", email: "fixture@example.test",
    imageId: null, image: [], status: "ACTIVE", sellerStatus: "DEFAULT", phoneNumber: "", addresses: [], accounts: [{ id: 1 }], transfers: [{ id: 1, status: "ACTIVE" }], socialNetworks: [],
  }));
  await page.route("**/order/1/CANCELLED", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++;
    if (response !== "lost") await gate;
    if (response === "late success") await fulfillJson(route, 1).catch(() => {});
    else await route.abort("connectionfailed").catch(() => {});
    completed = true;
  });
  await page.route("**/auth/login", route => {
    if (route.request().method() !== "OPTIONS") owner = 2;
    return fulfillJson(route, { access_token: "account-B", refresh_token: "refresh-B" });
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Сохранённая причина");
  await dialog.getByLabel("Дополнительный комментарий (необязательно)").fill("Пояснение покупателя или продавца");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  if (response === "lost") {
    await expectRecovery(dialog);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  } else await expect.poll(() => writes).toBe(1);
  // Logout может размонтировать форму и при незавершённом POST.
  await page.getByRole("button", { name: "Выход", exact: true, includeHidden: true }).evaluate(button => (button as HTMLButtonElement).click());
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByLabel(/^Email/).fill("b@example.test");
  await page.getByLabel(/^Пароль/).fill("password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
  // Next-навигация сохраняет QueryClient приложения между аккаунтами.
  await page.locator('a[href="/dashboard/purchase"]').first().click();
  await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
  release();
  await expect.poll(() => completed).toBe(true);
  await expect(dialog.getByLabel("Причина отмены")).toHaveValue("");
  await expect(dialog.getByLabel("Дополнительный комментарий (необязательно)")).toHaveValue("");
  await expect(dialog.getByText(/Результат отмены не подтверждён/)).toHaveCount(0);
  await dialog.getByLabel("Причина отмены").fill("Новый аккаунт");
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeEnabled();
  expect(writes).toBe(1);
});

test("accepted cancellation still blocks a stale BOOKED form after filter remount", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  let writes = 0;
  await page.route("**/order/1/CANCELLED", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++; return fulfillJson(route, 1);
  });
  await page.goto("/dashboard/purchase");
  const desktop = page.getByTestId("desktop-orders");
  await desktop.getByRole("button", { name: "Отменить", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Принятая отмена");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden();
  await desktop.getByRole("button", { name: /Завершены/ }).click();
  await desktop.getByRole("button", { name: /^Все/ }).click();
  await desktop.getByRole("button", { name: "Отменить", exact: true }).click();
  await expect(dialog.getByText("Заказ успешно отменён.", { exact: true })).toBeVisible();
  await dialog.getByLabel("Причина отмены").fill("Случайный повтор");
  const submit = dialog.getByRole("button", { name: "Отменить заказ", exact: true });
  await expect(submit).toBeDisabled();
  await submit.dispatchEvent("click");
  expect(writes).toBe(1);
});

test("confirmed refusal preserves input across another seller button and allows explicit retry after GET BOOKED", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  state.sellerOrders = [orderFixture(1, "BOOKED", 1)];
  let writes = 0;
  await page.route("**/order/1/CANCELLED", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (++writes === 1) {
      state.ordersStatus = 403;
      return fulfillJson(route, { message: "Rejected" }, 409);
    }
    state.sellerOrders[0].actualStatus = "CANCELLED";
    return fulfillJson(route, 1);
  });
  await page.goto("/dashboard/sales");
  const buttons = page.getByTestId("desktop-orders").getByRole("button", { name: "Отменить", exact: true });
  await buttons.first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Подтверждённый отказ");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText(/Не удалось проверить результат отмены/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  state.ordersStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(buttons.nth(1)).toBeEnabled();
  await buttons.nth(1).click();
  await expect(dialog.getByLabel("Причина отмены")).toHaveValue("Подтверждённый отказ");
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeEnabled();
  expect(writes).toBe(1);
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(writes).toBe(2);
});
