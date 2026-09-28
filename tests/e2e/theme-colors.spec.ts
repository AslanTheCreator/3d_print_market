import { expect, test, type Locator } from "@playwright/test";
import { mockGuestAuth } from "./helpers/guestAuth";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

const renderedColors = (locator: Locator) => locator.evaluate(element => {
  const rgba = (color: string) => {
    const channels = color.match(/[\d.]+/g)!.map(Number);
    return [channels[0], channels[1], channels[2], channels[3] ?? 1];
  };
  const composite = (foreground: number[], background: number[]) =>
    foreground.slice(0, 3).map((value, index) =>
      value * foreground[3] + background[index] * (1 - foreground[3]));
  const ancestors: Element[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) ancestors.push(node);
  let background = [255, 255, 255];
  for (const node of ancestors.reverse()) {
    background = composite(rgba(getComputedStyle(node).backgroundColor), background);
  }
  const style = getComputedStyle(element);
  return {
    background,
    foreground: composite(rgba(style.color), background),
    outline: composite(rgba(style.outlineColor), background),
    outlineWidth: parseFloat(style.outlineWidth),
  };
});

const contrast = (a: number[], b: number[]) => {
  const luminance = (rgb: number[]) => rgb.map(channel => channel / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const [first, second] = [luminance(a), luminance(b)];
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

const expectReadable = async (locator: Locator) => {
  const colors = await renderedColors(locator);
  expect(contrast(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
};

for (const width of [393, 1280]) {
  test(`warning renewal buttons and chips keep dark readable text at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupMobileAccount(page, baseURL);
    const product = {
      ...orderFixture(1, "BOOKED", 1).product,
      name: "Фигурка для продления",
      expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await page.route("**/products/my", route => fulfillJson(route, [product]));
    await page.goto("/dashboard/products");
    const chip = page.locator(".MuiChip-colorWarning");
    await expect(chip).toBeVisible();
    await expectReadable(chip);
    expect((await renderedColors(chip)).foreground).toEqual([33, 33, 33]);
    const extend = page.getByRole("button", { name: "Продлить", exact: true });
    await expectReadable(extend);
    await extend.click();
    const confirm = page.getByRole("dialog").getByRole("button", { name: "Продлить", exact: true });
    await expect(confirm).toBeVisible();
    await expectReadable(confirm);
    expect((await renderedColors(confirm)).background).toEqual([255, 176, 32]);
    await confirm.hover();
    await expectReadable(confirm);
    await page.getByRole("button", { name: "Отмена", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
}

test("warning summaries in purchases and sales use amber accents with readable counts", async ({ page, baseURL }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "ON_THE_WAY", 1)];
  state.sellerOrders = [orderFixture(2, "ASSEMBLING", 1)];
  for (const [path, label] of [["purchase", "В пути"], ["sales", "К отправке"]]) {
    await page.goto(`/dashboard/${path}`);
    const summary = page.getByTestId("desktop-orders").locator(".MuiPaper-root")
      .filter({ has: page.locator("p", { hasText: new RegExp(`^${label}$`) }) });
    await expect(summary).toHaveCount(1);
    const count = summary.getByRole("heading", { name: "1", exact: true });
    await expectReadable(count);
    expect((await renderedColors(count)).foreground).toEqual([33, 33, 33]);
    const icon = summary.locator("svg");
    expect((await renderedColors(icon)).background).toEqual([255, 176, 32]);
    await expectReadable(icon);
    await page.screenshot({ path: testInfo.outputPath(`warning-${path}.png`) });
  }
});

for (const width of [320, 393, 1280]) {
  test(`theme keeps guest actions, navigation and focus readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await mockGuestAuth(page);
    await page.goto("/favorites");
    const guest = page.getByTestId("unauthorized-state-favorites");
    await expect(guest).toBeVisible();
    const login = guest.getByRole("button", { name: "Войти", exact: true });
    const register = guest.getByRole("button", { name: "Создать аккаунт", exact: true });
    await expectReadable(login);
    await expectReadable(register);
    await expectReadable(guest.getByText("Войдите, чтобы сохранять понравившиеся товары и возвращаться к ним позже."));
    await login.hover();
    await expectReadable(login);
    await login.focus();
    await page.keyboard.press("Tab");
    await expect(register).toBeFocused();
    const focus = await renderedColors(register);
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(contrast(focus.outline, focus.background)).toBeGreaterThanOrEqual(3);

    if (width < 900) {
      const navigation = page.getByRole("navigation", { name: "Основная навигация" });
      const current = navigation.getByRole("link", { name: "Избранное", exact: true });
      const inactive = navigation.getByRole("link", { name: "Главная", exact: true });
      await expect(current).toHaveAttribute("aria-current", "page");
      expect((await renderedColors(current)).foreground).not.toEqual((await renderedColors(inactive)).foreground);
      await expectReadable(current);
      await expectReadable(inactive);
    } else {
      const header = page.getByRole("navigation", { name: "Действия в шапке сайта" });
      await expectReadable(header.getByText("Избранное", { exact: true }));
    }

    await page.goto("/auth/login");
    await expectReadable(page.getByRole("link", { name: "зарегистрируйтесь" }));
    await page.getByRole("textbox", { name: "Email" }).focus();
    const label = page.locator(".MuiInputLabel-root.Mui-focused");
    await expect(label).toHaveCount(1);
    await expectReadable(label);
  });

  test(`catalog differentiates purchase and preorder with readable labels at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await mockGuestAuth(page);
    const product = {
      count: 5, price: 1500, prepaymentAmount: 300, currency: "RUB",
      categories: [{ id: 1, name: "Фигурки", childs: [] }], imageId: 0,
      sellerId: 200, expirationDate: "2030-01-01T00:00:00.000Z",
      status: "ACTIVE", externalUrl: "", sellerLogin: "color-seller",
      sellerRating: 5, totalReviews: 1, createdAt: "2030-01-01T00:00:00.000Z",
    };
    await page.route("**/products/find", route => route.fulfill({
      contentType: "application/json",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify([
        { ...product, id: 902, name: "Обычная фигурка", availability: "PURCHASABLE" },
        { ...product, id: 903, name: "Фигурка по предзаказу", availability: "PREORDER" },
      ]),
    }));
    await page.goto("/catalog/search?query=colors");
    const purchase = page.getByRole("button", { name: "Купить", exact: true });
    const preorder = page.getByRole("button", { name: "Предзаказать", exact: true });
    await expect(purchase).toBeVisible();
    await expect(preorder).toBeVisible();
    await expectReadable(purchase);
    await expectReadable(preorder);
    expect(await preorder.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    const purchaseColors = await renderedColors(purchase);
    const preorderColors = await renderedColors(preorder);
    expect(preorderColors.background).toEqual([84, 197, 229]);
    expect(preorderColors.background).not.toEqual(purchaseColors.background);
    const badge = page.locator(".MuiChip-root").filter({ hasText: /^Предзаказ$/ });
    await expectReadable(badge);
    const badgeBox = (await badge.boundingBox())!;
    const favorite = preorder.locator("xpath=ancestor::*[contains(@class,'MuiCard-root')]/..")
      .getByRole("button", { name: "Добавить в избранное" });
    const favoriteBox = (await favorite.boundingBox())!;
    const overlaps = badgeBox.x < favoriteBox.x + favoriteBox.width && badgeBox.x + badgeBox.width > favoriteBox.x
      && badgeBox.y < favoriteBox.y + favoriteBox.height && badgeBox.y + badgeBox.height > favoriteBox.y;
    expect(overlaps).toBe(false);
    await preorder.hover();
    await expectReadable(preorder);
    await preorder.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}
