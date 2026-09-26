import { expect, test } from "@playwright/test";
import { getPostAuthRedirectPath } from "@/entities/session/model/authRedirect";
import { mockGuestAuth } from "./helpers/guestAuth";

test("post-auth destinations reject external URLs and auth loops", () => {
  for (const path of [
    null, "", "https://example.com", "//example.com", "/\\example.com",
    "/%5cexample.com", "/%2fexample.com", "/safe/..//example.com",
    "/auth/login", "/%61uth/register", "/safe/../auth/login", "/auth",
    "/\n/example.com", "/%0d%0a/example.com", "/%invalid",
  ]) expect(getPostAuthRedirectPath(path)).toBe("/");

  expect(getPostAuthRedirectPath("/checkout")).toBe("/checkout");
  expect(getPostAuthRedirectPath("/catalog/search?name=figure#results"))
    .toBe("/catalog/search?name=figure#results");
});

for (const width of [393, 1280]) {
  for (const destination of ["/checkout", "/favorites"]) {
    for (const flow of ["login", "register"] as const) {
      test(`${width}px ${destination} returns after switching auth forms and ${flow}`, async ({ page }) => {
        await mockGuestAuth(page);
        await page.setViewportSize({ width, height: 800 });
        await page.goto(destination);
        const guest = page.getByTestId(`unauthorized-state-${destination.slice(1)}`);
        await guest.getByRole("button", { name: flow === "login" ? "Создать аккаунт" : "Войти", exact: true }).click();
        await page.getByRole("link", { name: flow === "login" ? "Авторизуйтесь" : "зарегистрируйтесь", exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/auth/${flow}\\?`));
        await expect(page.getByRole("heading", { name: flow === "login" ? "Вход в аккаунт" : "Регистрация", exact: true })).toBeVisible();
        expect(new URL(page.url()).searchParams.get("redirect")).toBe(destination);

        const form = page.locator("form");
        await form.getByLabel(/^Email/).fill("guest-flow@example.com");
        await form.getByLabel(/^Пароль/).fill("test-password");
        if (flow === "register") {
          await form.getByLabel(/^Возраст/).fill("25");
          await form.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();
          const dialog = page.getByRole("dialog");
          for (let digit = 1; digit <= 5; digit++) {
            await dialog.getByRole("textbox", { name: `Цифра ${digit} из 5` }).fill(String(digit));
          }
          await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
        } else {
          await form.getByRole("button", { name: "Войти", exact: true }).click();
        }
        await expect(page).toHaveURL(new RegExp(`${destination}$`));
        await expect(guest).toBeHidden();
        if (destination === "/checkout") {
          await expect(page.getByTestId("app-chrome")).toHaveAttribute("data-mobile-chrome-mode", "focused");
          await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeHidden();
        }
      });
    }
  }
}

test("unsafe redirect is discarded when switching auth forms", async ({ page }) => {
  await mockGuestAuth(page);
  await page.goto(`/auth/login?${new URLSearchParams({ redirect: "/\\example.com" })}`);
  await page.getByRole("link", { name: "зарегистрируйтесь", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/register$/);
  await page.getByRole("link", { name: "Авторизуйтесь", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
});
