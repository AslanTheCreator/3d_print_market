import { expect, test } from "@playwright/test";

test.describe("registration legal consent notice", () => {
  test("shows the legal notice only during registration", async ({ page }) => {
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
        name: "пользовательское соглашение",
      }),
    ).toHaveCount(0);
    await expect(
      loginForm.getByRole("link", {
        name: "политикой конфиденциальности",
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
    await expect(registerForm.getByRole("checkbox")).toHaveCount(0);
    const agreementLink = registerForm.getByRole("link", {
      name: "пользовательское соглашение",
    });
    const privacyLink = registerForm.getByRole("link", {
      name: "политикой конфиденциальности",
    });
    const loginLink = page.getByRole("link", { name: "Авторизуйтесь" });
    const loginLinkText = loginLink.locator("span");
    const agreementLinkText = agreementLink.locator("span");
    const privacyLinkText = privacyLink.locator("span");
    await expect(agreementLink).toBeVisible();
    await expect(agreementLink).toHaveAttribute("href", "/user-agreement");
    await expect(agreementLinkText).toHaveCSS(
      "text-decoration-line",
      "underline",
    );
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute("href", "/privacy");
    await expect(privacyLinkText).toHaveCSS(
      "text-decoration-line",
      "underline",
    );
    await page.mouse.move(0, 0);
    const loginLinkColor = await loginLinkText.evaluate(
      (element) => getComputedStyle(element).color,
    );
    await expect(agreementLinkText).toHaveCSS("color", loginLinkColor);
    await expect(privacyLinkText).toHaveCSS("color", loginLinkColor);
    const legalNotice = registerForm.getByText(
      "Регистрируясь на сайте, я принимаю пользовательское соглашение, а также даю Правообладателю согласие на обработку моих персональных данных в соответствии с политикой конфиденциальности.",
    );
    await expect(legalNotice).toBeVisible();
    const [noticeFontSize, agreementFontSize, privacyFontSize] =
      await Promise.all(
        [legalNotice, agreementLinkText, privacyLinkText].map((element) =>
          element.evaluate((node) => getComputedStyle(node).fontSize),
        ),
      );
    expect(agreementFontSize).toBe(noticeFontSize);
    expect(privacyFontSize).toBe(noticeFontSize);
  });

  test("submits registration without a separate consent checkbox", async ({
    page,
  }) => {
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

  test("opens legal documents in new tabs", async ({ page }) => {
    await page.goto("/auth/register");

    for (const legalDocument of [
      {
        linkName: "пользовательское соглашение",
        url: /\/user-agreement$/,
      },
      {
        linkName: "политикой конфиденциальности",
        url: /\/privacy$/,
      },
    ]) {
      const legalLink = page.locator("form").getByRole("link", {
        name: legalDocument.linkName,
      });
      const popupPromise = page.waitForEvent("popup");

      await legalLink.click();

      const legalPage = await popupPromise;
      await legalPage.waitForLoadState("domcontentloaded");
      await expect(legalPage).toHaveURL(legalDocument.url);
      await legalPage.close();
    }
  });
});
