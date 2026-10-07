import { expect, test, type Locator } from "@playwright/test";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";
import { setupSettingsAccount } from "./helpers/settingsAccount";

async function submitForm(input: Locator) {
  await input.evaluate(element => element.closest("form")!.requestSubmit());
}

test("password invalid keyboard submit focuses each native input and keeps visibility/autofill", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/security");
  const oldPassword = page.getByLabel("Текущий пароль", { exact: true });
  const newPassword = page.getByLabel("Новый пароль", { exact: true });
  const confirm = page.getByLabel("Повторите пароль", { exact: true });
  await confirm.fill("secret-new");
  await confirm.press("Enter");
  await expect(oldPassword).toBeFocused();
  await expect(oldPassword).toHaveAttribute("aria-invalid", "true");
  await oldPassword.fill("secret-old");
  await confirm.press("Enter");
  await expect(newPassword).toBeFocused();
  await newPassword.fill("secret-new");
  await confirm.fill("mismatch");
  await confirm.press("Enter");
  await expect(confirm).toBeFocused();
  await page.getByRole("button", { name: "Показать подтверждение нового пароля" }).click();
  await expect(confirm).toHaveAttribute("type", "text");
  await expect(confirm).toHaveValue("mismatch");
  await page.getByRole("button", { name: "Скрыть подтверждение нового пароля" }).click();
  await expect(confirm).toHaveAttribute("type", "password");
  await expect(oldPassword).toHaveAttribute("autocomplete", "current-password");
  await expect(newPassword).toHaveAttribute("autocomplete", "new-password");
  await expect(confirm).toHaveAttribute("autocomplete", "new-password");
  expect(state.writes).toHaveLength(0);
  await confirm.fill("secret-new");
  await confirm.press("Enter");
  await expect.poll(() => state.writes.filter(write => write.path === "/participant/password").length).toBe(1);
  await expect(oldPassword).toHaveValue("");
});

for (const width of [393, 1280]) {
  test(`address invalid submit focuses first error including postal input at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setupSettingsAccount(page, baseURL);
    await page.goto("/dashboard/settings?tab=address");
    await page.getByRole("button", { name: width < 900 ? "Добавить новый адрес" : /^Редактировать адрес:/ }).first().click();
    const country = page.getByLabel("Страна", { exact: true });
    const city = page.getByLabel("Город", { exact: true });
    const street = page.getByLabel("Улица", { exact: true });
    const house = page.getByLabel(width < 900 ? "Дом" : "Номер дома", { exact: true });
    const apartment = page.getByLabel(width < 900 ? "Квартира" : "Номер квартиры", { exact: true });
    const index = page.getByLabel("Почтовый индекс", { exact: true });
    // Кнопка невалидного адреса отключена; requestSubmit проверяет настоящий RHF submit.
    for (const input of [city, street, house, index]) await input.fill("");
    await country.fill("");
    await submitForm(index);
    await expect(country).toBeFocused();
    await country.fill("Россия");
    for (const [input, value] of [[city, "Москва"], [street, "Тестовая"], [house, "12"], [index, "123456"]] as const) {
      await submitForm(apartment);
      await expect(input).toBeFocused();
      await expect(input).toHaveAttribute("aria-invalid", "true");
      await input.fill(value);
    }
    await expect(country).toHaveAttribute("autocomplete", "country-name");
    await expect(city).toHaveAttribute("autocomplete", "address-level2");
    await expect(street).toHaveAttribute("autocomplete", "address-line1");
    await expect(index).toHaveAttribute("autocomplete", "postal-code");
    expect(state.writes).toHaveLength(0);
    await expect(page.getByRole("button", { name: width < 900 ? "Добавить адрес" : "Сохранить изменения", exact: true })).toBeEnabled();
    await index.press("Enter");
    await expect.poll(() => state.writes.filter(write => write.path.startsWith("/address")).length).toBe(1);
  });

  test(`profile invalid keyboard submit focuses native inputs at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupMobileAccount(page, baseURL);
    const writes: unknown[] = [];
    await page.route("**/participant", route => {
      if (route.request().method() === "PUT") {
        writes.push(route.request().postDataJSON());
        return fulfillJson(route, null);
      }
      return route.fallback();
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Редактировать профиль", exact: true }).filter({ visible: true }).first().click();
    const login = page.getByLabel("Логин", { exact: true });
    const name = page.getByLabel("Имя и фамилия", { exact: true });
    const phone = page.getByLabel("Телефон", { exact: true });
    await login.fill("");
    await name.fill("");
    await phone.fill("invalid");
    await phone.press("Enter");
    await expect(login).toBeFocused();
    await login.fill("valid-login");
    await phone.press("Enter");
    await expect(name).toBeFocused();
    await name.fill("Тестовое имя");
    await phone.press("Enter");
    await expect(phone).toBeFocused();
    await expect(phone).toHaveAttribute("aria-invalid", "true");
    await expect(login).toHaveAttribute("autocomplete", "username");
    await expect(name).toHaveAttribute("autocomplete", "name");
    await expect(phone).toHaveAttribute("autocomplete", "tel");
    expect(writes).toHaveLength(0);
    await phone.fill("+79990000000");
    await phone.press("Enter");
    await expect.poll(() => writes.length).toBe(1);
  });
}

test("review visible labels describe textarea and rating with validation errors", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "COMPLETED", 1)];
  const writes: unknown[] = [];
  await page.route("**/reviews", route => {
    if (route.request().method() !== "OPTIONS") writes.push(route.request().postDataJSON());
    return fulfillJson(route, 1);
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Оставить отзыв", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  const rating = dialog.getByRole("radiogroup", { name: "Ваша оценка", exact: true });
  const comment = dialog.getByRole("textbox", { name: "Комментарий", exact: true });
  await expect(rating).toBeVisible();
  await comment.fill("а");
  await expect(comment).toHaveAccessibleDescription("Минимум 3 символа");
  await expect(comment).toHaveAttribute("aria-invalid", "true");
  await dialog.locator(`label[for="${await comment.getAttribute("id")}"]`).click();
  await expect(comment).toBeFocused();
  const fifth = rating.locator('input[value="5"]');
  await fifth.focus();
  await page.keyboard.press("Space");
  await expect(fifth).toBeChecked();
  await rating.locator('input[value=""]').focus();
  await page.keyboard.press("Space");
  await expect(rating).toHaveAttribute("aria-invalid", "true");
  await expect(rating).toHaveAccessibleDescription("Минимальная оценка — 1");
  await fifth.focus();
  await page.keyboard.press("Space");
  await expect(rating).toHaveAttribute("aria-invalid", "false");
  await comment.fill("Доступный отзыв");
  await expect(comment).toHaveAccessibleDescription("15/500");
  await dialog.getByRole("button", { name: "Отправить отзыв", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => writes.length).toBe(1);
  await expect(dialog.getByText("Спасибо за отзыв!", { exact: true })).toBeVisible();
});

for (const key of ["Enter", "Space"]) {
  test(`renewal is a separate Tab stop and ${key} writes once without navigation`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    const product = { ...orderFixture(1, "COMPLETED", 1).product, id: 42, name: "Товар для продления", expirationDate: "2020-01-01T00:00:00Z" };
    await page.route("**/products/my", route => fulfillJson(route, [product]));
    let writes = 0;
    await page.route("**/products/extend/42", route => {
      if (route.request().method() !== "OPTIONS") writes++;
      return fulfillJson(route, null);
    });
    await page.goto("/dashboard/products");
    const link = page.getByRole("link", { name: /Товар для продления/ }).filter({ has: page.getByText(product.name, { exact: true }) });
    const renew = page.getByRole("button", { name: "Продлить", exact: true });
    await expect(link.locator("button")).toHaveCount(0);
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(renew).toBeFocused();
    await page.keyboard.press(key);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Продлить", exact: true }).focus();
    await page.keyboard.press(key);
    await expect.poll(() => writes).toBe(1);
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/dashboard\/products$/);
    // Новый Tab проверяет нативную навигацию независимо от SSR наличия товара.
    await page.context().route("**/catalog/42/detail", route => {
      if (route.request().isNavigationRequest()) return route.fulfill({ contentType: "text/html", body: "<html><body>Товар для продления</body></html>" });
      return route.fallback();
    });
    const popupPromise = page.context().waitForEvent("page");
    await link.click({ modifiers: ["Control"] });
    const popup = await popupPromise;
    await popup.waitForURL(/\/catalog\/42\/detail$/);
    await popup.close();
    await expect(page).toHaveURL(/\/dashboard\/products$/);
    expect(writes).toBe(1);
  });
}

test("account menu icon has contrast and a 44px target in normal, focus and hover states", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 393, height: 900 });
  await setupMobileAccount(page, baseURL);
  await page.goto("/dashboard/security");
  const menu = page.getByRole("button", { name: "Открыть меню разделов профиля", exact: true });
  await expect(menu).toBeVisible();
  for (const state of ["normal", "focus", "hover"]) {
    if (state === "focus") {
      await page.keyboard.press("Tab");
      await menu.focus();
      await expect(menu).toBeFocused();
      await expect(menu).toHaveCSS("outline-style", "solid");
      await expect(menu).toHaveCSS("outline-width", "3px");
    }
    if (state === "hover") await menu.hover();
    const contrast = await menu.evaluate(button => {
      const rgba = (color: string) => color.match(/[\d.]+/g)!.map(Number);
      let background = [255, 255, 255];
      const ancestors: Element[] = [];
      for (let element: Element | null = button; element; element = element.parentElement) ancestors.unshift(element);
      for (const element of ancestors) {
        const [r, g, b, a = 1] = rgba(getComputedStyle(element).backgroundColor);
        background = [r, g, b].map((value, index) => value * a + background[index] * (1 - a));
      }
      const luminance = (color: number[]) => color.slice(0, 3).reduce((sum, value, index) => {
        const c = value / 255;
        return sum + (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
      }, 0);
      const icon = luminance(rgba(getComputedStyle(button.querySelector("svg")!).color));
      const bg = luminance(background);
      return (Math.max(icon, bg) + 0.05) / (Math.min(icon, bg) + 0.05);
    });
    expect(contrast, state).toBeGreaterThanOrEqual(3);
    await expect.poll(async () => (await menu.boundingBox())?.width ?? 0, { message: state }).toBeGreaterThanOrEqual(44);
    await expect.poll(async () => (await menu.boundingBox())?.height ?? 0, { message: state }).toBeGreaterThanOrEqual(44);
  }
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Профиль", exact: true })).toBeVisible();
});
