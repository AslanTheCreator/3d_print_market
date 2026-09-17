import { expect, test } from "@playwright/test";
import { expectNoOverflow, longProductName, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);
const widths = [320, 393, 599, 600, 768, 899, 900];

test("purchases keep one prioritised list, fit the first action and preserve details across breakpoints", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "COMPLETED", 25), orderFixture(2, "BOOKED", 20), orderFixture(3, "ON_THE_WAY", 15)];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard/purchase");
  await expect(page.getByRole("article")).toHaveCount(3);
  expect(await page.getByRole("article").evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")))).toEqual(["Заказ №3", "Заказ №2", "Заказ №1"]);
  await expect(page.getByRole("heading", { name: "Покупки", exact: true })).toHaveCount(1);
  await expect(page.getByTestId("desktop-orders")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "Профиль" })).toHaveAttribute("aria-current", "page");
  const first = page.getByRole("article").first();
  const bottom = await page.getByRole("navigation", { name: "Основная навигация" }).boundingBox();
  const card = await first.boundingBox();
  expect(card!.y + card!.height).toBeLessThanOrEqual(bottom!.y);
  for (const button of await first.getByRole("button").all()) {
    const bounds = await button.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: 727 });
    await expectNoOverflow(page);
    await expect(page.getByTestId(width < 900 ? "mobile-orders" : "desktop-orders")).toBeVisible();
  }
  await page.setViewportSize({ width: 393, height: 727 });
  const details = first.getByRole("button", { name: /Подробнее/ });
  await details.focus();
  await expect(details).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(longProductName, { exact: true })).toBeVisible();
  await expect(dialog.getByText("История заказа", { exact: true })).toBeVisible();
  for (const width of [599, 600, 899, 900, 320]) {
    await page.setViewportSize({ width, height: 727 });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    if (width < 900) expect(bounds!.width).toBe(width);
    await expectNoOverflow(page);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test("filters apply explicitly, cancel drafts, reset and show empty results", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "COMPLETED", 25), orderFixture(2, "BOOKED", 20), orderFixture(3, "ON_THE_WAY", 15)];
  await page.goto("/dashboard/purchase");
  const trigger = page.getByRole("button", { name: "Фильтры и сортировка", exact: true });
  await page.getByRole("button", { name: /Активные 2/ }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await trigger.click();
  await page.getByRole("radio", { name: /Заверш/ }).check();
  await page.getByRole("button", { name: "Закрыть фильтры" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await trigger.click();
  await page.getByRole("radio", { name: /Заверш/ }).check();
  await page.getByRole("button", { name: "Применить" }).click();
  await expect(page.getByRole("article", { name: "Заказ №1", exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await trigger.click();
  await page.getByRole("radio", { name: /К оплате/ }).check();
  await page.getByRole("button", { name: "Применить" }).click();
  await expect(page.getByRole("heading", { name: "Заказы не найдены" })).toBeVisible();
  await trigger.click();
  await page.getByRole("button", { name: "Сбросить", exact: true }).click();
  await page.getByRole("button", { name: "Применить" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("sales quick filters select confirmations and shipments without duplicate cards", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.sellerOrders = [orderFixture(1, "BOOKED", 15), orderFixture(2, "AWAITING_PREPAYMENT_APPROVAL", 20), orderFixture(3, "ASSEMBLING", 25)];
  await page.goto("/dashboard/sales");
  await expect(page.getByRole("heading", { name: "Продажи", exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.getByRole("button", { name: /Нужно подтвердить 2/ }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("button", { name: /К отправке 1/ }).click();
  await expect(page.getByRole("article", { name: "Заказ №3", exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 727 });
    await expectNoOverflow(page);
  }
});

test("orders loading, retry and empty states keep mobile shell and useful links", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  let release!: () => void;
  state.ordersGate = new Promise<void>((resolve) => { release = resolve; });
  state.ordersStatus = 500;
  await page.goto("/dashboard/purchase");
  await expect(page.getByRole("status", { name: "Загрузка раздела «Покупки»" })).toBeVisible();
  release();
  await expect(page.getByRole("button", { name: "Повторить", exact: true })).toBeVisible({ timeout: 20_000 });
  state.ordersStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("link", { name: "Перейти в каталог", exact: true })).toHaveAttribute("href", "/catalog/search");
  await page.goto("/dashboard/sales");
  await expect(page.getByRole("heading", { name: "Продаж пока нет" })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Мои товары", exact: true })).toHaveAttribute("href", "/dashboard/products");
  await expect(page.locator("main").getByRole("link", { name: "Создать товар", exact: true })).toHaveAttribute("href", "/dashboard/products/new");
});
