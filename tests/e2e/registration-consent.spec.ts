import { expect, test } from "@playwright/test";

test.describe("registration personal data consent", () => {
  test("shows consent only during registration", async ({ page }) => {
    await page.goto("/auth/login");

    const loginForm = page.locator("form");
    await expect(loginForm.getByRole("checkbox")).toHaveCount(0);
    await expect(
      loginForm.getByRole("link", {
        name: "Политикой обработки персональных данных",
      }),
    ).toHaveCount(0);

    await page.goto("/auth/register");

    const registerForm = page.locator("form");
    await expect(
      registerForm.getByRole("checkbox", {
        name: /Я даю согласие на обработку персональных данных/,
      }),
    ).toBeVisible();
    await expect(
      registerForm.getByRole("link", {
        name: "Политикой обработки персональных данных",
      }),
    ).toBeVisible();
  });

  test("blocks registration until consent is given", async ({ page }) => {
    let registrationRequestCount = 0;

    await page.route("**/participant", async (route) => {
      registrationRequestCount += 1;
      await route.fulfill({
        status: 200,
        json: 123,
      });
    });

    await page.goto("/auth/register");

    const registerForm = page.locator("form");
    const consentCheckbox = registerForm.getByRole("checkbox", {
      name: /Я даю согласие на обработку персональных данных/,
    });

    await registerForm.getByPlaceholder("Email").fill("user@example.com");
    await registerForm.getByPlaceholder("Пароль").fill("password");
    await registerForm.getByPlaceholder("Возраст").fill("25");
    await registerForm
      .getByRole("button", { name: "Зарегистрироваться" })
      .click();

    await expect(
      registerForm.getByText(
        "Необходимо дать согласие на обработку персональных данных",
      ),
    ).toBeVisible();
    expect(registrationRequestCount).toBe(0);

    await consentCheckbox.check();

    await expect(
      registerForm.getByText(
        "Необходимо дать согласие на обработку персональных данных",
      ),
    ).toHaveCount(0);

    await registerForm
      .getByRole("button", { name: "Зарегистрироваться" })
      .click();

    await expect.poll(() => registrationRequestCount).toBe(1);
  });

  test("opens the privacy policy in a new tab", async ({ page }) => {
    await page.goto("/auth/register");

    const privacyLink = page.locator("form").getByRole("link", {
      name: "Политикой обработки персональных данных",
    });
    const popupPromise = page.waitForEvent("popup");

    await privacyLink.click();

    const privacyPage = await popupPromise;
    await privacyPage.waitForLoadState("domcontentloaded");
    await expect(privacyPage).toHaveURL(/\/privacy$/);
  });
});
