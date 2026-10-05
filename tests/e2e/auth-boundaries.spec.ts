import { expect, test, type Page, type Route } from "@playwright/test";

const fulfill = (route: Route, body: unknown, status = 200) => route.fulfill({
  status: route.request().method() === "OPTIONS" ? 204 : status,
  headers: {
    "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  },
  contentType: "application/json",
  body: route.request().method() === "OPTIONS" ? "" : JSON.stringify(body),
});

const fillLogin = async (page: Page) => {
  await page.getByLabel(/^Email/).fill("fixture@example.test");
  await page.getByLabel(/^Пароль/).fill("password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await page.route("https://mc.yandex.ru/**", route => route.abort());
  await page.route("http://127.0.0.1:9/**", route => fulfill(route, []));
});

for (const method of ["getItem", "setItem"] as const) {
  test(`browser login, initialization, refresh and logout survive auth storage ${method} failure`, async ({ page, context }) => {
    const errors: Error[] = [];
    page.on("pageerror", error => errors.push(error));
    await page.addInitScript(method => {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { value: function (...args: string[]) {
        if (args[0] === "auth-storage") throw new DOMException("Denied", "SecurityError");
        return Reflect.apply(original, this, args);
      } });
    }, method);
    await page.route("http://127.0.0.1:9/auth/login", route => fulfill(route, {
      access_token: "fixture-access", refresh_token: "fixture-refresh",
    }));
    let refreshes = 0;
    await page.route("http://127.0.0.1:9/auth/refresh", route => {
      if (route.request().method() !== "OPTIONS") refreshes++;
      return fulfill(route, "fresh-access");
    });
    await page.goto("/auth/login?redirect=%2Fabout");
    await fillLogin(page);
    await expect(page).toHaveURL(/\/about$/);
    expect((await context.cookies()).find(c => c.name === "access_token")?.value).toBe("fixture-access");
    await context.clearCookies({ name: "access_token" });
    await page.reload();
    await expect.poll(() => refreshes).toBe(1);
    await expect.poll(async () => (await context.cookies()).find(c => c.name === "access_token")?.value).toBe("fresh-access");
    await page.goto("/dashboard/security");
    await page.getByRole("button", { name: "Выход", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeVisible();
    expect((await context.cookies()).filter(c => ["access_token", "refresh_token"].includes(c.name))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("malformed errors stay recoverable and verified cooldown expires before retry", async ({ page, context }) => {
  const errors: Error[] = [];
  page.on("pageerror", error => errors.push(error));
  let loginBody: unknown = null;
  await page.route("http://127.0.0.1:9/auth/login", route => fulfill(route, loginBody, 403));
  let resendBody: unknown = 123;
  let resendStatus = 200;
  await page.route("http://127.0.0.1:9/auth/verification/resend?**", route => fulfill(route, resendBody, resendStatus));
  let verifyStatus = 403;
  await page.route("http://127.0.0.1:9/auth/verify-code", route => fulfill(route,
    verifyStatus === 200 ? { access_token: "verified-access", refresh_token: "verified-refresh" } : null,
    verifyStatus,
  ));
  await page.goto("/auth/login?redirect=%2Fabout");
  await fillLogin(page);
  await expect(page.getByText("Ошибка авторизации. Проверьте логин и пароль.")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  loginBody = { code: "WAITING_VERIFY", next: "VERIFY_EMAIL", message: "Confirm email" };
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Цифра 1 из 5").fill("12345");
  await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Неверный код");
  const resend = dialog.getByRole("button", { name: "Отправить повторно", exact: true });
  resendStatus = 429;
  for (const body of [null, "failure", {}, { code: "VERIFICATION_COOLDOWN", retryAfterSec: -1 },
    { code: "VERIFICATION_COOLDOWN", retryAfterSec: "30" }]) {
    resendBody = body;
    await resend.click();
    await expect(dialog.getByRole("alert")).toHaveText("Ошибка при отправке кода. Попробуйте позже");
    await expect(resend).toBeEnabled();
    await expect(dialog.getByText(/Повторная отправка доступна/)).toBeHidden();
  }
  resendBody = { code: "VERIFICATION_COOLDOWN", retryAfterSec: 0 };
  await resend.click();
  await expect(dialog.getByRole("alert")).toBeHidden();
  await expect(resend).toBeEnabled();
  await page.clock.install();
  resendBody = { code: "VERIFICATION_COOLDOWN", retryAfterSec: 1.5 };
  await resend.click();
  await expect(dialog.getByText("Повторная отправка доступна через 0:02")).toBeVisible();
  await expect(resend).toBeDisabled();
  await page.clock.runFor(2000);
  await expect(resend).toBeEnabled();
  resendStatus = 200;
  resendBody = 123;
  await resend.click();
  await expect(dialog.getByLabel("Цифра 1 из 5")).toHaveValue("");
  await dialog.getByLabel("Цифра 1 из 5").fill("54321");
  verifyStatus = 200;
  await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  expect((await context.cookies()).find(c => c.name === "access_token")?.value).toBe("verified-access");
  expect(errors).toEqual([]);
});
