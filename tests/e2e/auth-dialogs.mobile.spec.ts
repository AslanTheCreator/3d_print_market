import { expect, type Locator, type Page, type Route, test } from "@playwright/test";

const email = "collector.with.a.long.address@example.com";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const fulfill = (route: Route, body: unknown, status = 200) => route.fulfill({
  status: route.request().method() === "OPTIONS" ? 204 : status,
  headers,
  contentType: "application/json",
  body: route.request().method() === "OPTIONS" ? "" : JSON.stringify(body),
});

const openVerification = async (page: Page) => {
  await page.route("**/participant", (route) => fulfill(route, 123));
  await page.goto("/auth/register");
  const form = page.locator("form");
  await form.getByLabel(/^Email/).fill(email);
  await form.getByLabel(/^Пароль/).fill("password");
  await form.getByLabel(/^Возраст/).fill("25");
  await form.getByRole("button", { name: "Зарегистрироваться" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
};

const openReset = async (page: Page) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Забыли пароль?" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
};

const expectLayout = async (page: Page, dialog: Locator, width: number) => {
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return width < 600
      ? Math.abs(box!.y + box!.height - page.viewportSize()!.height)
      : Math.abs(box!.y - (page.viewportSize()!.height - box!.height) / 2);
  }).toBeLessThan(1);
  const box = (await dialog.boundingBox())!;
  if (width < 600) {
    expect(box.x).toBe(0);
    expect(box.width).toBe(width);
    await expect(dialog).toHaveCSS("border-top-left-radius", "24px");
    await expect(dialog).toHaveCSS("border-bottom-left-radius", "0px");
  } else {
    expect(box.width).toBeLessThanOrEqual(600);
    await expect(dialog).toHaveCSS("border-radius", "16px");
  }
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  for (const action of await dialog.getByRole("button").all()) {
    const target = (await action.boundingBox())!;
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
};

test.beforeEach(async ({ page }) => {
  await page.route("https://mc.yandex.ru/**", route => route.abort());
});

test("verification is a mobile sheet, preserves desktop and keeps code usable", async ({ page }, testInfo) => {
  const requests: unknown[] = [];
  await page.route("**/auth/verify-code", route => {
    if (route.request().method() !== "OPTIONS") requests.push(route.request().postDataJSON());
    return fulfill(route, { message: "Invalid verification code" }, 400);
  });
  await page.route("**/auth/verification/resend?**", route => fulfill(route, 123));
  const dialog = await openVerification(page);
  const fields = dialog.getByRole("textbox");
  await fields.nth(0).fill("1");

  for (const width of [320, 393, 599, 600, 899, 900, 1440, 393]) {
    await page.setViewportSize({ width, height: 727 });
    await expectLayout(page, dialog, width);
    await expect(dialog).toHaveAccessibleName(width < 600 ? "Подтвердите почту" : "Подтверждение email");
    await expect(fields.nth(0)).toHaveValue("1");
    for (const field of await fields.all()) {
      const target = (await field.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    if (width === 393 || width === 900) await page.screenshot({ path: testInfo.outputPath(`verification-${width}.png`) });
  }

  await fields.nth(2).evaluate(element => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text", "98 765");
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, clipboardData }));
  });
  for (let i = 0; i < 5; i++) await expect(fields.nth(i)).toHaveValue("98765"[i]);
  await fields.nth(4).press("Tab");
  await expect(dialog.getByRole("button", { name: "Подтвердить", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("alert")).toHaveText("Неверный код. Попробуйте еще раз");
  expect(requests).toEqual([{ userId: 123, code: "98765" }]);
  for (let i = 0; i < 5; i++) await expect(fields.nth(i)).toHaveValue("98765"[i]);
  await expect(fields.nth(0)).toBeFocused();
  await fields.nth(0).fill("54321");
  for (let i = 0; i < 5; i++) await expect(fields.nth(i)).toHaveValue("54321"[i]);

  await dialog.getByRole("button", { name: "Отправить повторно" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Код отправлен повторно");
  for (const field of await fields.all()) await expect(field).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Зарегистрироваться" })).toBeFocused();
});

test("verification shows one server cooldown and preserves code on a network error", async ({ page }) => {
  await page.route("**/auth/verification/resend?**", route => fulfill(route, {
    code: "VERIFICATION_COOLDOWN", retryAfterSec: 60,
  }, 429));
  await page.route("**/auth/verify-code", route => route.abort());
  const dialog = await openVerification(page);
  await dialog.getByRole("textbox").nth(0).fill("12345");
  await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Не удалось проверить код. Попробуйте ещё раз");
  await expect(dialog.getByRole("textbox").nth(0)).toHaveValue("1");
  await dialog.getByRole("button", { name: "Отправить повторно" }).click();
  const resend = dialog.getByRole("button", { name: "Отправить повторно" });
  await expect(resend).toBeDisabled();
  await expect(resend).toHaveText(/Повторить через/);
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(dialog.getByText(/Повторная отправка доступна/)).toBeHidden();
});

test("reset handles errors, pending requests, success and return to login", async ({ page }, testInfo) => {
  let release: (() => void) | undefined;
  let fail = true;
  await page.route("**/auth/password/reset?**", async route => {
    if (route.request().method() === "OPTIONS") return fulfill(route, {});
    expect(new URL(route.request().url()).searchParams.get("email")).toBe(email);
    await new Promise<void>(resolve => { release = resolve; });
    await fulfill(route, fail ? { message: "Ошибка отправки" } : {}, fail ? 500 : 200);
  });
  const dialog = await openReset(page);
  const field = dialog.getByLabel("Email", { exact: true });
  await field.fill(email);
  for (const width of [320, 393, 599, 600, 900, 393]) {
    await page.setViewportSize({ width, height: 727 });
    await expectLayout(page, dialog, width);
    await expect(dialog).toHaveAccessibleName(width < 600 ? "Восстановить пароль" : "Забыли пароль?");
    await expect(field).toHaveValue(email);
  }
  await page.screenshot({ path: testInfo.outputPath("reset-393.png") });
  const send = dialog.getByRole("button", { name: "Отправить пароль" });
  try {
    await field.press("Enter");
    await expect(send).toBeDisabled();
    await expect(send).toHaveAttribute("aria-busy", "true");
    await expect(dialog.getByRole("button", { name: "Закрыть окно восстановления пароля" })).toBeDisabled();
    await expect.poll(() => Boolean(release)).toBe(true);
    release!();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(field).toHaveValue(email);
    fail = false;
    release = undefined;
    await send.click();
    await expect.poll(() => Boolean(release)).toBe(true);
    release!();
    await expect(dialog).toHaveAccessibleName("Проверьте почту");
    await expect(dialog.getByText(email, { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("reset-success.png") });
    await dialog.getByRole("button", { name: "Вернуться ко входу" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Забыли пароль?" })).toBeFocused();
  } finally { release?.(); }
});

test("sheets follow the visual viewport and scroll fields and actions together", async ({ page }) => {
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, { width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, scale: 1 });
    Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
  });
  for (const mode of ["verification", "reset"]) {
    await page.setViewportSize({ width: 320, height: 640 });
    const dialog = mode === "verification" ? await openVerification(page) : await openReset(page);
    const field = mode === "verification" ? dialog.getByRole("textbox").nth(0) : dialog.getByLabel("Email", { exact: true });
    await field.focus();
    await page.evaluate(() => {
      Object.assign(window.visualViewport!, { height: 280, offsetTop: 24 });
      window.visualViewport!.dispatchEvent(new Event("resize"));
    });
    await expect.poll(async () => {
      const box = (await dialog.boundingBox())!;
      return Math.abs(box.y + box.height - 304);
    }).toBeLessThan(1);
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.height).toBeLessThanOrEqual(264);
    const input = (await field.boundingBox())!;
    expect(input.y).toBeGreaterThanOrEqual(bounds.y);
    expect(input.y + input.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    const primary = dialog.getByRole("button", { name: mode === "verification" ? "Подтвердить" : "Отправить пароль", exact: true });
    await primary.scrollIntoViewIfNeeded();
    const button = (await primary.boundingBox())!;
    expect(button.y + button.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    expect(await dialog.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});
