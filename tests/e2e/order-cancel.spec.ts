import { expect, test } from "@playwright/test";
import type { OrderCancel } from "@/entities/order";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

for (const role of ["purchase", "sales"] as const) test(`${role}: desktop cancellation filter, terminal progress and history preserve server statuses`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  const orders = [orderFixture(1, "CANCELLED", 1), orderFixture(2, "FAILED", 2), orderFixture(3, "DISPUTED", 3)];
  orders[0].histories = [
    { status: "FAILED", changedAt: "2026-07-01T10:00:00Z", comment: null },
    { status: "CANCELLED", changedAt: "2026-07-02T10:00:00Z", comment: null },
  ];
  state[role === "purchase" ? "customerOrders" : "sellerOrders"] = orders;
  await page.goto(`/dashboard/${role}`);
  const desktop = page.getByTestId("desktop-orders");
  await expect(desktop.getByText("Отменён", { exact: true }).first()).toBeVisible();
  await expect(desktop.getByText("Спор решён в пользу покупателя", { exact: true }).first()).toBeVisible();
  await expect(desktop.getByText("На рассмотрении", { exact: true }).first()).toBeVisible();
  await expect(desktop.getByText("Этапы появятся после оплаты", { exact: true })).toHaveCount(0);
  await expect(desktop.getByRole("button", { name: /Отменить|Подтвердить|Отправить/ })).toHaveCount(0);
  await desktop.getByRole("button", { name: /Отменены/ }).click();
  await expect(desktop.getByText("Спор решён в пользу покупателя", { exact: true })).toHaveCount(0);
  await desktop.getByRole("button", { name: /Подробнее/ }).click();
  const history = page.getByTestId("order-history");
  await expect(history.getByText("Спор решён в пользу покупателя", { exact: true })).toBeVisible();
  await expect(history.getByText("Отменён", { exact: true })).toBeVisible();
  const bodyIncludesOrderId: "orderId" extends keyof OrderCancel ? true : false = false;
  expect(bodyIncludesOrderId).toBe(false);
});

test("seller cancellation denial retains input; failed control GET permits only reading until recovery", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.sellerOrders = [orderFixture(1, "BOOKED", 1)];
  let writes = 0;
  await page.route("**/order/1/CANCELLED", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++; state.ordersStatus = 403;
    return fulfillJson(route, { message: "Отмена отклонена" }, 409);
  });
  await page.goto("/dashboard/sales");
  await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Сохранить введённую причину");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText(/Не удалось проверить результат отмены/)).toBeVisible();
  await expect(dialog.getByLabel("Причина отмены")).toHaveValue("Сохранить введённую причину");
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  state.ordersStatus = 200;
  await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await expect(dialog.getByText(/Отмена отклонена. Заказ перечитан/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeEnabled();
  expect(writes).toBe(1);
});

test("seller cancellation loss of response preserves input and checks with GET without replay", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.sellerOrders = [orderFixture(1, "BOOKED", 1)];
  let writes = 0;
  await page.route("**/order/1/CANCELLED", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++; return route.abort("connectionfailed");
  });
  await page.goto("/dashboard/sales");
  await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Сохраняем при потере ответа");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog.getByText(/Результат отмены не подтверждён/)).toBeVisible();
  await expect(dialog.getByLabel("Причина отмены")).toHaveValue("Сохраняем при потере ответа");
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
  await expect(dialog.getByLabel("Причина отмены")).toHaveValue("Сохраняем при потере ответа");
  await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
  state.sellerOrders[0].actualStatus = "CANCELLED";
  await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(writes).toBe(1);
});
