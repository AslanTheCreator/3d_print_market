import { expect, test } from "@playwright/test";
import { mockGuestAuth } from "./helpers/guestAuth";

test("login accepts a trimmed identifier with unchanged Email label", async ({ page }) => {
  await mockGuestAuth(page);
  await page.goto("/auth/login");
  await page.getByLabel(/^Email/).fill("  superAdmin  ");
  await page.getByLabel(/^Пароль/).fill("test-password");
  const request = page.waitForRequest(request =>
    request.url() === "http://127.0.0.1:9/auth/login" && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ mail: "superAdmin", password: "test-password" });
  await expect(page).toHaveURL(/\/$/);
});

test("registration still rejects a login without an email address", async ({ page }) => {
  await mockGuestAuth(page);
  await page.goto("/auth/register");
  await page.getByLabel(/^Email/).fill("superAdmin");
  await page.getByLabel(/^Пароль/).fill("test-password");
  await page.getByLabel(/^Возраст/).fill("25");
  await page.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();
  await expect(page.getByText("Введите корректный email", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/register$/);
});
