import { expect, test } from "@playwright/test";

test.describe("registration personal data consent", () => {
  test("shows consent only during registration", async ({ page }) => {
    await page.goto("/auth/login");

    const loginForm = page.locator("form");
    const loginEmail = loginForm.getByLabel(/^Email/);
    const loginPassword = loginForm.getByLabel(/^Пароль/);

    await expect(loginEmail).toBeVisible();
    await expect(loginPassword).toBeVisible();

    const showPasswordButton = loginForm.getByRole("button", {
      name: "Показать пароль",
    });
    await expect(showPasswordButton).toHaveAttribute("aria-pressed", "false");
    await showPasswordButton.click();
    await expect(
      loginForm.getByRole("button", { name: "Скрыть пароль" }),
    ).toHaveAttribute("aria-pressed", "true");

    await loginForm
      .getByRole("button", { name: "Войти", exact: true })
      .click();
    await expect(loginEmail).toHaveAttribute("aria-describedby", /.+/);
    await expect(loginPassword).toHaveAttribute("aria-describedby", /.+/);

    await expect(loginForm.getByRole("checkbox")).toHaveCount(0);
    await expect(
      loginForm.getByRole("link", {
        name: "Политикой обработки персональных данных",
      }),
    ).toHaveCount(0);

    await page.goto("/auth/register");

    const registerForm = page.locator("form");
    await expect(
      registerForm.getByLabel(/^Email/),
    ).toBeVisible();
    await expect(
      registerForm.getByLabel(/^Пароль/),
    ).toBeVisible();
    await expect(
      registerForm.getByLabel(/^Возраст/),
    ).toBeVisible();
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
    await page.route("**/auth/verify-code", async (route) => {
      await route.fulfill({
        status: 400,
        json: {
          message: "Invalid verification code",
        },
      });
    });

    await page.goto("/auth/register");

    const registerForm = page.locator("form");
    const consentCheckbox = registerForm.getByRole("checkbox", {
      name: /Я даю согласие на обработку персональных данных/,
    });

    await registerForm
      .getByLabel(/^Email/)
      .fill("user@example.com");
    await registerForm
      .getByLabel(/^Пароль/)
      .fill("password");
    await registerForm.getByLabel(/^Возраст/).fill("25");
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

    const verificationDialog = page.getByRole("dialog", {
      name: "Подтверждение email",
    });
    const codeGroup = verificationDialog.getByRole("group", {
      name: "Код подтверждения",
    });

    await expect(verificationDialog).toBeVisible();
    for (let index = 1; index <= 5; index += 1) {
      await codeGroup
        .getByRole("textbox", { name: `Цифра ${index} из 5` })
        .fill(String(index));
    }

    await verificationDialog
      .getByRole("button", { name: "Подтвердить" })
      .click();

    const verificationError = verificationDialog.getByRole("alert");
    await expect(verificationError).toHaveText(
      "Неверный код. Попробуйте еще раз",
    );
    const errorId = await verificationError.getAttribute("id");
    expect(errorId).toBeTruthy();

    for (let index = 1; index <= 5; index += 1) {
      await expect(
        codeGroup.getByRole("textbox", { name: `Цифра ${index} из 5` }),
      ).toHaveAttribute("aria-describedby", errorId!);
    }
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
