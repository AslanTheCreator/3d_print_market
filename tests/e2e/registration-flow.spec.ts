import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockGuestAuth } from "./helpers/guestAuth";
import { expectNoOverflow, fulfillJson } from "./helpers/mobileAccount";

const email = "figure+registration@example.test";
const password = "fixture-password";
const registrationPayload = { mail: email, password, age: 25 };
const submit = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться", exact: true });
const verification = (page: Page) => page.getByRole("dialog", { name: /Подтверждение email|Подтвердите почту/ });
const resend = (dialog: Locator) => dialog.getByRole("button", { name: "Отправить повторно", exact: true });

async function fillRegistration(page: Page) {
  await page.goto("/auth/register?redirect=%2Fabout");
  const form = page.locator("form").filter({ has: page.locator("#auth-email") });
  await form.getByLabel(/^Email/).fill(email);
  await form.getByLabel(/^Пароль/).fill(password);
  await form.getByLabel(/^Возраст/).fill("25");
  for (const checkbox of await form.getByRole("checkbox").all()) await checkbox.check();
  return form;
}

function hold() {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  return { pending, release };
}

async function mockRegistration(page: Page) {
  await mockGuestAuth(page);
  const registrations: unknown[] = [];
  const resends: { method: string; query: [string, string][]; body: string | null }[] = [];
  const verifications: unknown[] = [];
  const state = {
    registrations, resends, verifications, registrationGate: Promise.resolve(), resendGate: Promise.resolve(),
    registrationStatus: 200, registrationBody: 41 as unknown,
    resendStatus: 200, resendBody: 41 as unknown, resendNetworkFailure: false,
  };
  await page.route("**/participant", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    registrations.push(route.request().postDataJSON());
    await state.registrationGate;
    return fulfillJson(route, state.registrationBody, state.registrationStatus);
  });
  await page.route("**/auth/verification/resend?*", async route => {
    const request = route.request();
    if (request.method() === "OPTIONS") return fulfillJson(route, null);
    resends.push({
      method: request.method(),
      query: [...new URL(request.url()).searchParams.entries()],
      body: request.postData(),
    });
    await state.resendGate;
    return state.resendNetworkFailure
      ? route.abort("failed")
      : fulfillJson(route, state.resendBody, state.resendStatus);
  });
  await page.route("**/auth/verify-code", route => {
    if (route.request().method() === "POST") verifications.push(route.request().postDataJSON());
    return fulfillJson(route, { access_token: "fixture-verified" });
  });
  return state;
}

test("registration uses its returned ID without resending and only resumes verification after success", async ({ page }) => {
  const state = await mockRegistration(page);
  const form = await fillRegistration(page);
  await form.getByLabel(/^Пароль/).press("Enter");
  const dialog = verification(page);
  await expect(dialog.getByText(email, { exact: true })).toBeVisible();
  expect(state.registrations).toEqual([registrationPayload]);
  expect(state.resends).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const resume = page.getByRole("button", { name: "Продолжить подтверждение email" });
  await expect(resume).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Цифра 1 из 5").fill("12345");
  await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  expect(state.verifications).toEqual([{ userId: 41, code: "12345" }]);
  expect(state.registrations).toEqual([registrationPayload]);
  expect(state.resends).toEqual([]);
});

for (const width of [1280, 393]) {
  test(`occupied email is an editable field error at ${width}px and offers login`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await mockRegistration(page);
    state.registrationStatus = 404;
    state.registrationBody = { code: "PARTICIPANT_ALREADY_EXISTS", message: `Unexpected echo: ${password}` };
    const form = await fillRegistration(page);
    await submit(page).click();
    const helper = form.getByText(/^Этот email уже используется/);
    const field = form.getByLabel(/^Email/);
    await expect(helper).toBeVisible();
    await expect(helper).not.toContainText(password);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAttribute("aria-describedby", (await helper.getAttribute("id"))!);
    await expect(field).toHaveValue(email);
    await expect(form.getByLabel(/^Пароль/)).toHaveValue(password);
    await expect(form.getByLabel(/^Возраст/)).toHaveValue("25");
    for (const checkbox of await form.getByRole("checkbox").all()) await expect(checkbox).toBeChecked();
    await expect(verification(page)).toBeHidden();
    await expectNoOverflow(page);

    await field.fill("new@example.test");
    await expect(helper).toBeHidden();
    await expect(field).toHaveAttribute("aria-invalid", "false");
    await page.getByRole("link", { name: "Авторизуйтесь" }).click();
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fabout$/);
    await expect(page.getByRole("button", { name: "Забыли пароль?" })).toBeVisible();
    expect(state.registrations).toEqual([registrationPayload]);
    expect(state.resends).toEqual([]);
  });
}

test("two submits in the same browser task share one attempt and an ordinary 404 permits a retry", async ({ page }) => {
  const state = await mockRegistration(page);
  const attempt = hold();
  state.registrationGate = attempt.pending;
  state.registrationStatus = 404;
  state.registrationBody = { code: "OTHER_ERROR", message: "Маршрут не найден" };
  const form = await fillRegistration(page);
  try {
    await form.evaluate((element: HTMLFormElement) => {
      element.requestSubmit();
      element.requestSubmit();
    });
    await expect.poll(() => state.registrations.length).toBe(1);
    await expect(form.locator("button[type=submit]")).toBeDisabled();
    await form.evaluate((element: HTMLFormElement) => element.requestSubmit());
  } finally {
    attempt.release();
  }
  await expect(page.getByText("Маршрут не найден", { exact: true })).toBeVisible();
  await expect(form.getByLabel(/^Email/)).toHaveAttribute("aria-invalid", "false");
  await expect(submit(page)).toBeEnabled();
  expect(state.registrations).toEqual([registrationPayload]);
  expect(state.resends).toEqual([]);
  await expect(verification(page)).toBeHidden();

  state.registrationStatus = 200;
  state.registrationBody = 41;
  await form.getByLabel(/^Email/).fill("retry@example.test");
  await submit(page).click();
  await expect(verification(page).getByText("retry@example.test", { exact: true })).toBeVisible();
  expect(state.registrations).toEqual([registrationPayload, { ...registrationPayload, mail: "retry@example.test" }]);
  expect(state.resends).toEqual([]);
});

test("a late conflict for a previous email does not mark the edited field invalid", async ({ page }) => {
  const state = await mockRegistration(page);
  const attempt = hold();
  state.registrationGate = attempt.pending;
  state.registrationStatus = 404;
  state.registrationBody = { code: "PARTICIPANT_ALREADY_EXISTS" };
  const form = await fillRegistration(page);
  const field = form.getByLabel(/^Email/);
  try {
    await submit(page).click();
    await expect.poll(() => state.registrations.length).toBe(1);
    await field.fill("edited@example.test");
  } finally {
    attempt.release();
  }
  await expect(submit(page)).toBeEnabled();
  await expect(field).toHaveValue("edited@example.test");
  await expect(field).toHaveAttribute("aria-invalid", "false");
  await expect(form.getByText(/^Этот email уже используется/)).toHaveCount(0);
  await expect(verification(page)).toBeHidden();
  expect(state.resends).toEqual([]);
});

test("explicit resend has only query email and does not overlap another request", async ({ page }) => {
  const state = await mockRegistration(page);
  const attempt = hold();
  state.resendGate = attempt.pending;
  await fillRegistration(page);
  await submit(page).click();
  const dialog = verification(page);
  const button = resend(dialog);
  await expect(button).toBeEnabled();
  expect(state.resends).toEqual([]);
  try {
    await button.evaluate((element: HTMLButtonElement) => {
      element.click();
      element.click();
    });
    await expect.poll(() => state.resends.length).toBe(1);
    await expect(button).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Закрыть окно подтверждения email" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
  } finally {
    attempt.release();
  }
  await expect(dialog.getByRole("status")).toHaveText("Запрос на повторную отправку принят");
  expect(state.resends).toEqual([{ method: "POST", query: [["email", email]], body: null }]);
  expect(state.registrations).toEqual([registrationPayload]);
});

test("resend distinguishes cooldown, daily limit, unstructured response and network failure", async ({ page }) => {
  const state = await mockRegistration(page);
  await fillRegistration(page);
  await submit(page).click();
  const dialog = verification(page);
  const button = resend(dialog);
  await expect(button).toBeEnabled();
  expect(state.resends).toEqual([]);

  await page.clock.install();
  state.resendStatus = 429;
  state.resendBody = { code: "VERIFICATION_COOLDOWN", retryAfterSec: 30 };
  await button.click();
  await expect(dialog.getByText("Повторная отправка доступна через 0:30")).toBeVisible();
  await expect(button).toBeDisabled();
  await dialog.getByRole("button", { name: "Закрыть окно подтверждения email" }).click();
  await page.getByRole("button", { name: "Продолжить подтверждение email" }).click();
  await expect(button).toBeDisabled();
  await page.clock.runFor(30_000);
  await expect(button).toBeEnabled();
  expect(state.resends).toHaveLength(1);

  for (const [body, networkFailure, message] of [
    [{ code: "VERIFICATION_DAILY_LIMIT" }, false, "Достигнут дневной лимит отправки кода. Попробуйте позже."],
    ["Malformed reply", false, "Ошибка при отправке кода. Попробуйте позже"],
    [null, true, "Нет соединения с сервером. Повторите попытку после восстановления связи."],
  ] as const) {
    state.resendBody = body;
    state.resendNetworkFailure = networkFailure;
    await button.click();
    await expect(dialog.getByRole("alert")).toHaveText(message);
    await expect(button).toBeEnabled();
    await expect(dialog.getByText(/Повторная отправка доступна/)).toBeHidden();
  }
  expect(state.resends).toHaveLength(4);
  expect(state.registrations).toEqual([registrationPayload]);
});

test("WAITING_VERIFY login still obtains the ID before opening confirmation", async ({ page }) => {
  const state = await mockRegistration(page);
  state.resendBody = 52;
  await page.route("**/auth/login", route => fulfillJson(route, { code: "WAITING_VERIFY", next: "VERIFY_EMAIL" }, 403));
  await page.goto("/auth/login?redirect=%2Fabout");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Пароль/).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const dialog = verification(page);
  await expect(dialog.getByText(email, { exact: true })).toBeVisible();
  expect(state.registrations).toEqual([]);
  expect(state.resends).toEqual([{ method: "POST", query: [["email", email]], body: null }]);
  await dialog.getByLabel("Цифра 1 из 5").fill("12345");
  await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  expect(state.verifications).toEqual([{ userId: 52, code: "12345" }]);
});
