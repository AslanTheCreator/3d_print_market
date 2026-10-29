import { expect, test } from "@playwright/test";
import { orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

for (const width of [393, 1280]) test(`order with missing category keeps the list and details usable at ${width}px`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width, height: 900 });
  const account = await setupMobileAccount(page, baseURL);
  const legacy = orderFixture(8, "BOOKED", 1);
  // Реальный DEV-ответ для удалённого товара: snapshot есть, categories=null.
  Object.assign(legacy.product, { categories: null });
  account.customerOrders = [legacy, orderFixture(9, "CANCELLED", 2)];
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard/purchase");
  const region = page.getByTestId(width < 900 ? "mobile-orders" : "desktop-orders");
  await expect(region).toBeVisible();
  await region.getByRole("button", { name: "Подробнее о заказе №8", exact: true }).first().click();
  await expect(page.getByTestId("order-cases")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Без категории", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
