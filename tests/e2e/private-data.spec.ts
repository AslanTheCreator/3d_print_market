import { expect, test, type Page, type Route } from "@playwright/test";
import { setupMobileAccount, png } from "./helpers/mobileAccount";

test.setTimeout(90_000);
const draftKey = "create-product-form-draft";
const reply = (route: Route, data: unknown, status = 200) => route.fulfill({
  status: route.request().method() === "OPTIONS" ? 204 : status,
  headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-refresh-token", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS" },
  contentType: "application/json", body: route.request().method() === "OPTIONS" ? undefined : JSON.stringify(data),
});

async function setup(page: Page, baseURL?: string) {
  await setupMobileAccount(page, baseURL);
  await page.context().addCookies([{ name: "refresh_token", value: "fixture-refresh", url: baseURL! }, { name: "token_created_at", value: String(Date.now()), url: baseURL! }]);
  const state = { owner: 1, refreshStatus: 200, uploads: 0, refreshes: 0, forceRefresh: false };
  for (const path of ["/auth/profile", "/participant"]) {
    await page.route(`http://127.0.0.1:9${path}`, route => reply(route, {
      id: state.owner, login: `account-${state.owner}`, fullName: `Account ${state.owner}`, role: "USER", mail: "fixture@example.test", email: "fixture@example.test",
      imageId: null, image: [], status: "ACTIVE", sellerStatus: "DEFAULT", phoneNumber: "", addresses: [], accounts: [{ id: 1 }], transfers: [{ id: 1, status: "ACTIVE" }], socialNetworks: [{ id: 1 }],
    }));
  }
  await page.route("http://127.0.0.1:9/auth/login", route => {
    if (route.request().method() !== "OPTIONS") state.owner = 2;
    return reply(route, { access_token: "fixture-B", refresh_token: "fixture-refresh-B" });
  });
  await page.route("http://127.0.0.1:9/auth/refresh", route => {
    if (route.request().method() !== "OPTIONS") state.refreshes++;
    return reply(route, state.refreshStatus === 200 ? "fixture-refreshed" : { message: "Expired" }, state.refreshStatus);
  });
  await page.route("http://127.0.0.1:9/images?*", route => {
    if (route.request().method() === "POST") {
      state.uploads++;
      if (state.forceRefresh && state.uploads === 1) return reply(route, { code: "TOKEN_INVALID_OR_EXPIRED" }, 401);
    }
    return reply(route, [77]);
  });
  return state;
}

async function loginB(page: Page) {
  await expect.poll(() => page.getByRole("button", { name: "Войти", exact: true }).evaluate(element =>
    Object.keys(element).some(key => key.startsWith("__reactProps$")))).toBe(true);
  await page.getByLabel(/^Email/).fill("b@example.test");
  await page.getByLabel(/^Пароль/).fill("password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });
}
async function upload(page: Page) {
  await page.locator('form input[type="file"]').setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
}

test("UI logout A → B shows B profile and never restores A draft", async ({ page, baseURL }) => {
  await setup(page, baseURL);
  await page.goto("/dashboard");
  await expect(page.getByText("account-1", { exact: true }).first()).toBeVisible();
  await page.locator('a[href="/dashboard/products/new"]').first().click();
  await page.getByRole("textbox", { name: "Название товара" }).fill("Private draft A");
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null")?.owner, draftKey)).toBe(1);
  await page.getByRole("button", { name: "Выход", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
  await loginB(page);
  // Navigate through Next links to retain the same QueryClient across accounts.
  await page.locator('a[href="/dashboard"]').first().click();
  await expect(page.getByText("account-2", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("account-1", { exact: true })).toHaveCount(0);
  await page.locator('a[href="/dashboard/products/new"]').first().click();
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("");
});

for (const owner of [undefined, 1]) {
  test(`reload rejects ${owner === undefined ? "legacy" : "another owner's"} persisted draft`, async ({ page, baseURL }) => {
    const state = await setup(page, baseURL);
    state.owner = 2;
    await page.addInitScript(({ key, owner }) => localStorage.setItem(key, JSON.stringify({ owner, imageIds: [], values: { name: "Private draft A" } })), { key: draftKey, owner });
    await page.goto("/dashboard/products/new");
    await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("");
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("");
  });
}

test("same-account refresh preserves input and owned draft", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  state.forceRefresh = true;
  await page.goto("/dashboard/products/new");
  await page.getByRole("textbox", { name: "Название товара" }).fill("Preserved A input");
  await upload(page);
  await expect.poll(() => state.refreshes).toBe(1);
  await expect.poll(() => state.uploads).toBe(2);
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("Preserved A input");
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null")?.values.name, draftKey)).toBe("Preserved A input");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("Preserved A input");
});

test("automatic expiry clears draft before document redirect and B login", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  state.forceRefresh = true;
  state.refreshStatus = 401;
  await page.goto("/dashboard/products/new");
  await page.getByRole("textbox", { name: "Название товара" }).fill("Expired A draft");
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), draftKey)).not.toBeNull();
  await upload(page);
  await expect(page).toHaveURL(/\/auth\/login/);
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
  await loginB(page);
  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("");
});
