import { expect, test } from "@playwright/test";

test.describe("registration required legal consents", () => {
  test("shows the legal notice only during registration", async ({ page }) => {
    await page.goto("/auth/login");

    const loginForm = page.locator("form").filter({ has: page.locator("#auth-email") });
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
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(
      loginForm.getByRole("link", {
        name: "Пользовательского соглашения",
      }),
    ).toHaveCount(0);
    await expect(
      loginForm.getByRole("link", {
        name: "Политикой конфиденциальности",
      }),
    ).toHaveCount(0);

    await page.goto("/auth/register");

    const registerForm = page.locator("form").filter({ has: page.locator("#auth-email") });
    await expect(
      registerForm.getByLabel(/^Email/),
    ).toBeVisible();
    await expect(
      registerForm.getByLabel(/^Пароль/),
    ).toBeVisible();
    await expect(
      registerForm.getByLabel(/^Возраст/),
    ).toBeVisible();
    await expect(registerForm.getByRole("checkbox")).toHaveCount(2);
    await expect(page.getByRole("checkbox")).toHaveCount(2);
    for (const checkbox of await registerForm.getByRole("checkbox").all()) {
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).toHaveAttribute("aria-required", "true");
    }
    await expect(registerForm.getByText(/Регистрируясь на сайте/)).toHaveCount(0);
    const agreementLink = registerForm.getByRole("link", {
      name: "Пользовательского соглашения",
    });
    const privacyLink = registerForm.getByRole("link", {
      name: "Политикой конфиденциальности",
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
    for (const link of [agreementLinkText, privacyLinkText]) {
      await expect(link).toHaveCSS("font-size", "13px");
    }
  });

  test("submits once with both consents and preserves email verification", async ({
    page,
  }) => {
    let registrationRequestCount = 0;

    await page.route("**/participant", async (route) => {
      registrationRequestCount += 1;
      expect(route.request().postDataJSON()).toEqual({
        mail: "user@example.com", password: "password", age: 25,
      });
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

    const registerForm = page.locator("form").filter({ has: page.locator("#auth-email") });
    await registerForm
      .getByLabel(/^Email/)
      .fill("user@example.com");
    await registerForm
      .getByLabel(/^Пароль/)
      .fill("password");
    await registerForm.getByLabel(/^Возраст/).fill("25");
    await registerForm.getByRole("checkbox").nth(0).check();
    await registerForm.getByRole("checkbox").nth(1).check();
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
    expect(registrationRequestCount).toBe(1);
  });

  test("opens legal documents in new tabs", async ({ page }) => {
    await page.goto("/auth/register");

    for (const legalDocument of [
      {
        linkName: "Пользовательского соглашения",
        url: /\/user-agreement$/,
      },
      {
        linkName: "Политикой конфиденциальности",
        url: /\/privacy$/,
      },
    ]) {
      const legalLink = page.locator("form").filter({ has: page.locator("#auth-email") }).getByRole("link", {
        name: legalDocument.linkName,
      });
      await expect(legalLink).toHaveAttribute("target", "_blank");
      await expect(legalLink).toHaveAttribute("rel", "noopener noreferrer");
      const checkboxes = page.locator("form").filter({ has: page.locator("#auth-email") }).getByRole("checkbox");
      const before = await Promise.all([checkboxes.nth(0).isChecked(), checkboxes.nth(1).isChecked()]);
      const popupPromise = page.waitForEvent("popup");

      await legalLink.click();

      const legalPage = await popupPromise;
      await legalPage.waitForLoadState("domcontentloaded");
      await expect(legalPage).toHaveURL(legalDocument.url);
      await legalPage.close();
      expect(await Promise.all([checkboxes.nth(0).isChecked(), checkboxes.nth(1).isChecked()])).toEqual(before);
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
    }
  });
});

const consentErrors = [
  "Необходимо принять пользовательское соглашение",
  "Необходимо дать согласие на обработку персональных данных",
];

for (const initiallyChecked of [-1, 0, 1]) {
  test(`blocks submission and clears individual errors (checked: ${initiallyChecked})`, async ({ page }) => {
    let requests = 0;
    await page.route("**/participant", async (route) => {
      requests += 1;
      await route.fulfill({ status: 200, json: 123 });
    });
    await page.goto("/auth/register");
    const form = page.locator("form").filter({ has: page.locator("#auth-email") });
    await form.getByLabel(/^Email/).fill("user@example.com");
    await form.getByLabel(/^Пароль/).fill("password");
    await form.getByLabel(/^Возраст/).fill("25");
    const checkboxes = form.getByRole("checkbox");
    await expect(checkboxes.nth(0)).toHaveAccessibleName("Я принимаю условия Пользовательского соглашения.");
    await expect(checkboxes.nth(1)).toHaveAccessibleName("Я ознакомлен(а) с Политикой конфиденциальности и даю согласие на обработку моих персональных данных.");
    if (initiallyChecked >= 0) await checkboxes.nth(initiallyChecked).check();
    const submit = form.getByRole("button", { name: "Зарегистрироваться" });
    await expect(submit).toBeEnabled();
    await submit.click();
    for (let index = 0; index < 2; index++) {
      const checkbox = checkboxes.nth(index);
      if (index === initiallyChecked) {
        await expect(form.getByText(consentErrors[index], { exact: true })).toHaveCount(0);
        await expect(checkbox).toBeChecked();
      } else {
        const error = form.getByText(consentErrors[index], { exact: true });
        await expect(error).toBeVisible();
        await expect(checkbox).toHaveAttribute("aria-invalid", "true");
        await expect(checkbox).toHaveAttribute("aria-describedby", (await error.getAttribute("id"))!);
      }
    }
    expect(requests).toBe(0);
    await expect(form.getByLabel(/^Email/)).toHaveValue("user@example.com");
    await expect(form.getByLabel(/^Пароль/)).toHaveValue("password");
    await expect(form.getByLabel(/^Возраст/)).toHaveValue("25");
    for (let index = 0; index < 2; index++) {
      if (index === initiallyChecked) continue;
      await checkboxes.nth(index).focus();
      await page.keyboard.press("Space");
      await expect(checkboxes.nth(index)).toBeChecked();
      await expect(form.getByText(consentErrors[index], { exact: true })).toHaveCount(0);
      await expect(checkboxes.nth(index)).toHaveAttribute("aria-invalid", "false");
      await expect(checkboxes.nth(index)).not.toHaveAttribute("aria-describedby");
    }
    expect(requests).toBe(0);
    await submit.click();
    await expect(page.getByRole("dialog", { name: "Подтверждение email" })).toBeVisible();
    expect(requests).toBe(1);
  });
}

for (const width of [393, 1280]) {
  test(`consents fit without overlap at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/auth/register");
    const form = page.locator("form").filter({ has: page.locator("#auth-email") });
    await form.getByLabel(/^Возраст/).fill("25");
    await form.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(form.getByText(consentErrors[1], { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const labels = form.locator(".MuiFormControlLabel-root");
    const age = await form.getByLabel(/^Возраст/).boundingBox();
    const first = await labels.nth(0).boundingBox();
    const second = await labels.nth(1).boundingBox();
    const submit = await form.getByRole("button", { name: "Зарегистрироваться" }).boundingBox();
    expect(first!.y).toBeGreaterThanOrEqual(age!.y + age!.height);
    expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height);
    expect(submit!.y).toBeGreaterThanOrEqual(second!.y + second!.height);
    for (const label of await labels.all()) {
      const box = (await label.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      const target = (await label.locator(".MuiCheckbox-root").boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    await form.screenshot({ path: testInfo.outputPath(`registration-${width}.png`) });
  });
}
