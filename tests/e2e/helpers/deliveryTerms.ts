import { expect, type Page } from "@playwright/test";
import { orderFixture, setupMobileAccount, fulfillJson } from "./mobileAccount";

export const deliveryFixture = () => Object.assign(orderFixture(43, "BOOKED", 1), { deliveryCarrier: "YANDEX", deliveryAddress: "Первый адрес" });
export async function openSeller(page: Page, baseURL: string | undefined, order = deliveryFixture()) {
  const state = await setupMobileAccount(page, baseURL);
  state.sellerOrders.push(order);
  await page.goto("/dashboard/sales");
  const list = page.locator('[data-testid="desktop-orders"]:visible, [data-testid="mobile-orders"]:visible');
  await list.getByRole("button", { name: "Подробнее о заказе №43" }).first().click();
  await page.getByRole("button", { name: "Изменить условия доставки" }).click();
  await expect(page.getByLabel("Адрес или ПВЗ")).toHaveValue(order.deliveryAddress);
  return { order, state };
}
export async function saveFreeDelivery(page: Page) {
  await page.getByLabel("Стоимость доставки (RUB)").fill("0,00");
  await page.getByLabel("Причина изменения").fill("Согласовано");
  await page.getByRole("button", { name: "Сохранить условия" }).click();
}
export async function successScenario(page: Page, baseURL: string | undefined) {
  const { order } = await openSeller(page, baseURL);
  let puts = 0;
  await page.route("**/order/43/terms-history", route => fulfillJson(route, puts ? [{id: 1, actor_id: 2, kind: "DELIVERY_CHANGED",
    payload: '{"before":{"deliveryAmount":500.00},"after":{"deliveryAmount":0.00,"reason":"Согласовано"}}'}] : []));
  await page.route("**/order/43/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toEqual({ expectedVersion: 0, carrier: "YANDEX", address: "Первый адрес", deliveryAmount: "0.00", reason: "Согласовано" });
    puts++;
    order.termsVersion = 1;
    Object.assign(order.calculation!, { deliveryAmount: "0.00", totalAmount: "4000.00", remainingAmount: "3000.00" });
    return fulfillJson(route, order.orderId);
  });
  await page.getByRole("button", { name: "История условий доставки" }).click();
  await expect(page.getByText("Изменений доставки пока нет")).toBeVisible();
  await saveFreeDelivery(page);
  await expect(page.getByText("Условия доставки обновлены", { exact: true })).toBeVisible();
  await expect(page.getByText("Стоимость: 500.00 RUB → Бесплатно")).toBeVisible();
  await expect(page.getByTestId("order-payment-breakdown")).toContainText(/3\s?000,00/);
  expect(puts).toBe(1);
}
