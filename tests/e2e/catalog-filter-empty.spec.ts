import { expect, test, type Page } from "@playwright/test";
import { mockGuestAuth } from "./helpers/guestAuth";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);

type FindRequest = { name?: string; categoryId?: number; priceRange?: { minPrice?: number; maxPrice?: number } };
const product = { ...orderFixture(1, "BOOKED", 1).product, id: 8101, name: "Товар фильтра", price: 1000, imageId: 0 };
const dialog = (page: Page) => page.getByRole("dialog", { name: "Цена", exact: true });

async function openFilter(page: Page) {
  const trigger = page.getByTestId("price-range-trigger");
  await trigger.focus();
  await trigger.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole("textbox", { name: "От", exact: true })).toBeFocused();
  return dialog(page);
}

async function setupSearch(page: Page) {
  await mockGuestAuth(page);
  const requests: FindRequest[] = [];
  await page.route("**/products/find", route => {
    if (route.request().method() !== "OPTIONS") requests.push(route.request().postDataJSON());
    return fulfillJson(route, [product, { ...product, id: 8102, price: 9000 }]);
  });
  await page.goto("/catalog/search?query=filter");
  await expect(page.getByText(product.name, { exact: true }).first()).toBeVisible();
  return requests;
}

for (const width of [1280, 320]) {
  test(`${width}px price draft preserves both/one-sided/zero/precise ranges on reopen, apply, cancel and reset`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const requests = await setupSearch(page);
    let panel = await openFilter(page);
    const min = () => panel.getByRole("textbox", { name: "От", exact: true });
    const max = () => panel.getByRole("textbox", { name: "До", exact: true });
    await expect(min()).toHaveValue("");
    await expect(max()).toHaveValue("");
    await expect(min()).toHaveAttribute("placeholder", "1000");
    await expect(max()).toHaveAttribute("placeholder", "9000");
    await panel.getByRole("button", { name: "Готово", exact: true }).click();
    await expect(panel).toBeHidden();
    expect(requests.at(-1)?.priceRange).toBeUndefined();

    for (const range of [
      { minPrice: 100.1234, maxPrice: 5000 },
      { minPrice: 0 },
      { maxPrice: 500.25 },
      { minPrice: 1e21 },
    ]) {
      panel = await openFilter(page);
      await min().fill(range.minPrice === undefined ? "" : range.minPrice.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 4 }));
      await max().fill(range.maxPrice === undefined ? "" : String(range.maxPrice));
      await panel.getByRole("button", { name: "Готово", exact: true }).click();
      await expect.poll(() => requests.at(-1)?.priceRange).toEqual(range);
      await expect(page.getByTestId("price-range-trigger")).toBeFocused();
      panel = await openFilter(page);
      expect(Number(await min().inputValue())).toBe(range.minPrice ?? 0);
      await expect(min()).toHaveValue(range.minPrice === undefined ? "" : range.minPrice.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 4 }));
      await expect(max()).toHaveValue(range.maxPrice === undefined ? "" : String(range.maxPrice));
      const count = requests.length;
      await panel.getByRole("button", { name: "Готово", exact: true }).click();
      await expect(panel).toBeHidden();
      expect(requests.length).toBe(count);
      panel = await openFilter(page);
      await min().fill("200");
      await max().fill("300");
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(page.getByTestId("price-range-trigger")).toBeFocused();
      expect(requests.length).toBe(count);
      panel = await openFilter(page);
      await expect(min()).toHaveValue(range.minPrice === undefined ? "" : range.minPrice.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 4 }));
      await expect(max()).toHaveValue(range.maxPrice === undefined ? "" : String(range.maxPrice));
      await page.keyboard.press("Escape");
    }
    panel = await openFilter(page);
    await min().fill("700");
    await page.locator(".MuiBackdrop-root").click({ position: { x: 1, y: 1 } });
    await expect(panel).toBeHidden();
    await expect(page.getByTestId("price-range-trigger")).toBeFocused();
    panel = await openFilter(page);
    await expect(min()).toHaveValue("1000000000000000000000");
    await page.keyboard.press("Escape");
    panel = await openFilter(page);
    await panel.getByRole("button", { name: "Сбросить", exact: true }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByRole("button", { name: "Сбросить фильтр цены", exact: true })).toHaveCount(0);
    panel = await openFilter(page);
    await expect(min()).toHaveValue("");
    await expect(max()).toHaveValue("");
  });

  test(`${width}px keyboard enters fields, cycles Tab/Shift+Tab, applies Enter and restores focus after Escape`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const requests = await setupSearch(page);
    const panel = await openFilter(page);
    await page.keyboard.press("Tab");
    await expect(panel.getByRole("textbox", { name: "До", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(panel.getByRole("textbox", { name: "От", exact: true })).toBeFocused();
    const controls = width === 1280 ? 4 : 5;
    for (let index = 0; index < controls; index++) await page.keyboard.press("Tab");
    await expect(panel.getByRole("textbox", { name: "От", exact: true })).toBeFocused();
    for (let index = 0; index < controls; index++) await page.keyboard.press("Shift+Tab");
    await expect(panel.getByRole("textbox", { name: "От", exact: true })).toBeFocused();
    await page.mouse.move(0, 0);
    await expect(panel).toBeVisible();
    await panel.getByRole("textbox", { name: "От", exact: true }).fill("100");
    await page.keyboard.press("Enter");
    await expect.poll(() => requests.at(-1)?.priceRange).toEqual({ minPrice: 100 });
    await expect(page.getByTestId("price-range-trigger")).toBeFocused();
    await openFilter(page);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(page.getByTestId("price-range-trigger")).toBeFocused();
  });
}

test("320px short screen with 200% text keeps the named mobile dialog scrollable and all controls reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await setupSearch(page);
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const panel = await openFilter(page);
  await expect(panel).toHaveAttribute("aria-modal", "true");
  await expect(panel.getByRole("textbox", { name: "От", exact: true })).toHaveCSS("font-size", "28px");
  await panel.getByRole("textbox", { name: "От", exact: true }).fill("9".repeat(400));
  await expect(panel.getByText("Введите конечную неотрицательную цену", { exact: true })).toBeVisible();
  expect(await panel.evaluate(element => ({ scrolls: element.scrollHeight > element.clientHeight, fits: element.getBoundingClientRect().height <= window.innerHeight }))).toEqual({ scrolls: true, fits: true });
  for (const control of [
    panel.getByRole("textbox", { name: "До", exact: true }),
    panel.getByRole("button", { name: "Готово", exact: true }),
    panel.getByRole("button", { name: "Сбросить", exact: true }),
    panel.getByRole("button", { name: "Закрыть", exact: true }),
  ]) {
    await control.focus();
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeFocused();
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(241);
  }
  await panel.getByRole("button", { name: "Закрыть", exact: true }).press("Enter");
  await expect(panel).toBeHidden();
  await expect(page.getByTestId("price-range-trigger")).toBeFocused();
});

test("invalid and overflowing prices block Apply without a new request", async ({ page }) => {
  const requests = await setupSearch(page);
  const panel = await openFilter(page);
  for (const invalid of ["NaN", "Infinity", "9".repeat(400)]) {
    const count = requests.length;
    await panel.getByRole("textbox", { name: "От", exact: true }).fill(invalid);
    await panel.getByRole("button", { name: "Готово", exact: true }).click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("textbox", { name: "От", exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(requests.length).toBe(count);
  }
});

for (const consumer of ["search", "category", "preorder-search", "home"] as const) {
  test(`${consumer}: empty has context/action, loading/error never show empty and leading content survives`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    let status = 200;
    const requests: FindRequest[] = [];
    await page.route("**/products/find", route => {
      if (route.request().method() !== "OPTIONS") requests.push(route.request().postDataJSON());
      return fulfillJson(route, status === 200 ? [] : { message: "Catalog unavailable" }, status);
    });
    const url = consumer === "category" ? "/catalog/category/32-figurki" : consumer === "home" ? "/" : `/catalog/search?query=${consumer === "preorder-search" ? "предзаказы" : "missing"}`;
    await page.goto(url);
    if (consumer === "home") {
      await expect(page.getByText("Розыгрыш фигурки недели", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Товары не найдены", exact: true })).toHaveCount(0);
      return;
    }
    await expect(page.getByRole("heading", { name: "Товары не найдены", exact: true })).toBeVisible();
    await expect(page.getByText(/сейчас нет доступных предзаказов/i)).toHaveCount(0);
    if (consumer === "category") {
      await expect(page.getByText("В этой категории пока нет доступных товаров. Посмотрите товары на главной странице.", { exact: true })).toBeVisible();
    } else {
      await expect(page.getByText("По вашему запросу товары не найдены. Измените запрос или сбросьте поиск.", { exact: true })).toBeVisible();
    }

    const panel = await openFilter(page);
    await panel.getByRole("textbox", { name: "От", exact: true }).fill("200");
    await panel.getByRole("button", { name: "Готово", exact: true }).click();
    await expect.poll(() => requests.at(-1)?.priceRange).toEqual({ minPrice: 200 });
    await expect(page.getByText(/Измените или сбросьте фильтр цены\./)).toBeVisible();
    await page.getByRole("button", { name: "Сбросить фильтр цены", exact: true }).last().click();
    await expect(page.getByRole("button", { name: "Сбросить фильтр цены", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: consumer === "category" ? "На главную" : "Сбросить поиск", exact: true })).toBeVisible();

    // A new query key with a controlled response verifies initial loading/error independently of cached empty data.
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    status = 503;
    await page.route("**/products/find", async route => {
      await gate;
      return fulfillJson(route, { message: "Catalog unavailable" }, status);
    });
    await openFilter(page);
    await dialog(page).getByRole("textbox", { name: "От", exact: true }).fill("300");
    await dialog(page).getByRole("button", { name: "Готово", exact: true }).click();
    try {
      await expect(page.getByRole("heading", { name: "Товары не найдены", exact: true })).toHaveCount(0);
      await expect(page.getByTestId("error-state-products")).toHaveCount(0);
    } finally { release(); }
    await expect(page.getByTestId("error-state-products")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Товары не найдены", exact: true })).toHaveCount(0);
    status = 200;
    await page.unroute("**/products/find");
    await page.route("**/products/find", route => fulfillJson(route, []));
    await page.getByRole("button", { name: "Обновить", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Товары не найдены", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Сбросить фильтр цены", exact: true }).last().click();
    await page.getByRole("button", { name: consumer === "category" ? "На главную" : "Сбросить поиск", exact: true }).click();
    await expect(page).toHaveURL(consumer === "category" ? /\/$/ : /\/catalog\/search$/);
  });
}
