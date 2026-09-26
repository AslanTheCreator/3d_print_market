import { expect, test } from "@playwright/test";
import { mockGuestAuth } from "./helpers/guestAuth";

for (const [path, title] of [["/checkout", "Корзина"], ["/favorites", "Избранное"]]) {
  test(`guest ${path} fits mobile screens and keeps desktop composition`, async ({ page }, testInfo) => {
    await mockGuestAuth(page);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (/hydration|did not match|hydrated but/i.test(message.text())) errors.push(message.text());
    });
    await page.goto(path);
    const guest = page.getByTestId(`unauthorized-state-${path.slice(1)}`);
    await expect(guest).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "Основная навигация" });

    for (const width of [320, 375, 393, 599, 600, 768, 899, 900, 1280]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 727 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const heading = guest.getByRole("heading", { level: 1, name: title, exact: true });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveCSS("font-size", width < 900 ? "24px" : "18px");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

      const login = guest.getByRole("button", { name: "Войти", exact: true });
      const register = guest.getByRole("button", { name: "Создать аккаунт", exact: true });
      const loginBox = (await login.boundingBox())!;
      const registerBox = (await register.boundingBox())!;
      const catalog = guest.getByRole("link", { name: "Перейти в каталог", exact: true });
      if (width < 900) {
        await expect(navigation).toBeVisible();
        await expect(navigation.getByRole("link", { name: title, exact: true })).toHaveAttribute("aria-current", "page");
        expect(loginBox.height).toBeGreaterThanOrEqual(48);
        expect(registerBox.height).toBeGreaterThanOrEqual(48);
        expect(registerBox.y).toBeGreaterThan(loginBox.y);
        await expect(catalog).toBeVisible();
        const catalogBox = (await catalog.boundingBox())!;
        expect(catalogBox.y + catalogBox.height).toBeLessThanOrEqual((await navigation.boundingBox())!.y);
        if (path === "/favorites") {
          await expect(page.getByRole("navigation", { name: "Информация о сервисе" })).toBeVisible();
          await expect(page.locator("footer").getByText("Покупателям", { exact: true })).toBeHidden();
        }
      } else {
        await expect(navigation).toBeHidden();
        await expect(catalog).toBeHidden();
        expect(registerBox.y).toBe(loginBox.y);
        await expect(page.locator("footer").getByText("Покупателям", { exact: true })).toBeVisible();
      }
      if (width === 393 || width === 1280) await page.screenshot({ path: testInfo.outputPath(`${path.slice(1)}-${width}.png`) });
    }

    await page.setViewportSize({ width: 393, height: 727 });
    await guest.getByRole("link", { name: "Перейти в каталог" }).click();
    await expect(page).toHaveURL(/\/catalog\/search$/);
    expect(errors).toEqual([]);
  });
}
