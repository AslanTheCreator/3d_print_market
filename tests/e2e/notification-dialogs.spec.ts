import { expect, test, type Locator } from "@playwright/test";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";
import { mockGuestAuth } from "./helpers/guestAuth";

// Проверяем фактическую видимость/доставку ввода, а не только порядок z-index.
async function expectHitTarget(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport({ ratio: 1 });
  await expect.poll(() => target.evaluate(element => {
    const box = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  })).toBe(true);
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 393, height: 400 }]) {
  test(`DELETE failure is readable and dismissible inside the open dialog at ${viewport.width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize(viewport);
    await setupMobileAccount(page, baseURL);
    const product = { ...orderFixture(1, "BOOKED", 1).product, id: 101, name: "Тестовая фигурка" };
    let deletes = 0;
    await page.route("**/products/my", route => fulfillJson(route, [product]));
    await page.route("**/product/101", route => {
      if (route.request().method() === "DELETE") deletes++;
      return fulfillJson(route, { code: "INTERNAL_ERROR" }, 500);
    });
    await page.goto("/dashboard/products");
    await page.getByRole("button", { name: `Действия с товаром ${product.name}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Удалить", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Удалить", exact: true }).click();
    const error = dialog.getByRole("alert").filter({ hasText: "Не удалось удалить товар" });
    await expect(error).toBeVisible();
    await expectHitTarget(error.locator(".MuiAlert-message"));
    const dismiss = error.getByRole("button", { name: "Закрыть уведомление" });
    await expectHitTarget(dismiss);
    await dismiss.focus();
    await expect(dismiss).toBeFocused();
    await dismiss.press("Enter");
    await expect(error).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    const cancel = dialog.getByRole("button", { name: "Отмена", exact: true });
    await expectHitTarget(cancel);
    await cancel.click();
    await expect(dialog).toBeHidden();
    expect(deletes).toBe(1);
    await expect(page.getByText(product.name, { exact: true })).toBeVisible();
  });

  test(`Reset notification does not cover return or steal modal focus at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockGuestAuth(page);
    await page.goto("/auth/login");
    const forgot = page.getByRole("button", { name: "Забыли пароль?" });
    await forgot.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email", { exact: true }).fill("reset@example.com");
    await dialog.getByRole("button", { name: "Отправить пароль", exact: true }).click();
    await expect(dialog).toHaveAccessibleName("Проверьте почту");
    const notice = dialog.getByRole("alert").filter({ hasText: "Временный пароль отправлен на вашу почту" });
    await expect(notice).toBeVisible();
    await expectHitTarget(notice.locator(".MuiAlert-message"));
    await expect(dialog.getByText("reset@example.com", { exact: true })).toBeVisible();
    const back = dialog.getByRole("button", { name: viewport.width < 600 ? "Вернуться ко входу" : "Понятно", exact: true });
    await expectHitTarget(back);
    await back.focus();
    await expect(back).toBeFocused();
    await back.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(forgot).toBeFocused();
  });
}
