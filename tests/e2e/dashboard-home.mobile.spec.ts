import { expect, type Locator, type Page, type Route, test } from "@playwright/test";

test.setTimeout(90_000);

const user = {
  id: 1,
  login: "mobile-user",
  mail: "mobile@example.com",
  fullName: "Mobile User",
  phoneNumber: "",
  status: "ACTIVE",
  sellerStatus: "DEFAULT",
  averageRating: 0,
  totalReviews: 0,
  imageId: null,
  image: [],
  addresses: [],
  accounts: [],
  transfers: [],
  socialNetworks: [],
};

const destinations = [
  ["Мои товары", "/dashboard/products"],
  ["Покупки", "/dashboard/purchase"],
  ["Продажи", "/dashboard/sales"],
  ["Создать товар", "/dashboard/products/new"],
  ["Настройки", "/dashboard/settings"],
  ["Безопасность", "/dashboard/security"],
] as const;

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status: route.request().method() === "OPTIONS" ? 204 : status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    },
    contentType: "application/json",
    body: route.request().method() === "OPTIONS" ? undefined : JSON.stringify(body),
  });
};

const setupDashboard = async (page: Page, baseURL: string | undefined) => {
  if (!baseURL) throw new Error("Playwright baseURL is required");
  const state = {
    user: { ...user } as Record<string, unknown>,
    profileStatus: 200,
    profileReads: 0,
    writes: [] as Record<string, unknown>[],
    orderProductReads: 0,
  };
  await page.context().addCookies([
    { name: "access_token", value: "dashboard-test-token", url: baseURL },
  ]);
  await page.route("**/api/config", (route) => fulfillJson(route, { apiUrl: "http://127.0.0.1:9" }));
  await page.route("https://mc.yandex.ru/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.route("http://127.0.0.1:9/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (path === "/auth/profile") {
      return fulfillJson(route, {
        id: 1, login: state.user.login, fullName: state.user.fullName,
        role: "USER", email: user.mail, imageId: null, image: [], exp: 0, type: "access",
      });
    }
    if (path === "/auth/login") {
      return fulfillJson(route, { access_token: "dashboard-relogin-token", refresh_token: "dashboard-refresh-token" });
    }
    if (path === "/participant") {
      if (route.request().method() === "PUT") {
        const payload = route.request().postDataJSON() as Record<string, unknown>;
        state.writes.push(payload);
        state.user = { ...state.user, ...payload };
        return fulfillJson(route, 1);
      }
      state.profileReads += 1;
      return fulfillJson(route, state.profileStatus === 200 ? state.user : { message: "Profile unavailable" }, state.profileStatus);
    }
    if (["/order/customer", "/order/seller", "/products/my"].includes(path)) state.orderProductReads += 1;
    return fulfillJson(route, []);
  });
  return state;
};

const accountNavigation = (page: Page) => page.getByRole("navigation", { name: "Разделы личного кабинета" });
const bottomNavigation = (page: Page) => page.getByRole("navigation", { name: "Основная навигация" });
const profile = (page: Page) => page.getByTestId("profile-overview");

const expectNoOverflow = async (page: Page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

const expectAboveBottomBar = async (element: Locator, page: Page) => {
  const box = await element.boundingBox();
  const bar = await bottomNavigation(page).boundingBox();
  expect(box).not.toBeNull();
  expect(bar).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(bar!.y + 1);
};

test("dashboard shows direct sections in order and keeps the first four above the bottom bar", async ({ page, baseURL }) => {
  const state = await setupDashboard(page, baseURL);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|did not match|server rendered/i.test(message.text())) errors.push(message.text());
  });
  await page.setViewportSize({ width: 393, height: 727 });
  await page.goto("/dashboard");
  await expect(profile(page)).toBeVisible();
  const navigation = accountNavigation(page);
  await expect(navigation.getByRole("link")).toHaveText([
    "Мои товары", "Покупки", "Продажи", "Создать товар",
    "НастройкиАдреса, доставка, оплата и связь", "Безопасность",
  ]);
  await expect(page.getByRole("button", { name: "Открыть меню разделов профиля" })).toBeHidden();
  await expect(page.getByText("Заполненность профиля", { exact: true })).toBeHidden();
  await expect(page.getByText("Профиль Figurzilla", { exact: true })).toBeHidden();
  await expect(page.locator("main").getByRole("link", { name: /Избранное/ })).toBeHidden();
  await expect(profile(page).getByRole("button", { name: "Редактировать профиль" })).toHaveCount(1);
  await expect(profile(page).getByRole("button", { name: "Редактировать профиль" })).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(profile(page).getByText("Пока нет отзывов")).toBeVisible();
  await expect(bottomNavigation(page).getByRole("link", { name: "Профиль", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("footer")).toBeHidden();
  for (const [label] of destinations.slice(0, 4)) {
    await expectAboveBottomBar(navigation.getByRole("link", { name: label, exact: true }), page);
  }
  expect((await profile(page).boundingBox())!.y).toBeGreaterThanOrEqual(56);
  for (const control of await navigation.getByRole("link").or(navigation.getByRole("button")).all()) {
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(56);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
  const edit = profile(page).getByRole("button", { name: "Редактировать профиль" });
  await edit.focus();
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link", { name: "Мои товары", exact: true })).toBeFocused();
  await expect(navigation.getByRole("link", { name: "Мои товары", exact: true })).toHaveCSS("outline-style", "solid");
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expectAboveBottomBar(navigation.getByRole("button", { name: "Выйти", exact: true }), page);
  await expectNoOverflow(page);
  expect(state.orderProductReads).toBe(0);
  expect(errors).toEqual([]);

  const safeAreaSession = await page.context().newCDPSession(page);
  try {
    await safeAreaSession.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 24, right: 0, bottom: 20, left: 0 },
    });
    await expect(bottomNavigation(page)).toHaveCSS("padding-bottom", "20px");
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expectAboveBottomBar(navigation.getByRole("button", { name: "Выйти", exact: true }), page);
  } finally {
    await safeAreaSession.send("Emulation.setSafeAreaInsetsOverride", { insets: {} });
    await safeAreaSession.detach();
  }

  for (const [label, href] of destinations) {
    await expect(navigation.getByRole("link", { name: label, exact: label !== "Настройки" })).toHaveAttribute("href", href);
    await navigation.getByRole("link", { name: label, exact: label !== "Настройки" }).click();
    await expect(page).toHaveURL((url) => url.pathname === href);
    await page.goto("/dashboard");
  }
});

test("dashboard keeps sections usable while the profile is loading or fails, and retry recovers", async ({ page, baseURL }) => {
  const state = await setupDashboard(page, baseURL);
  let releaseProfile!: () => void;
  const pendingProfile = new Promise<void>((resolve) => { releaseProfile = resolve; });
  await page.route("**/participant", async (route) => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    await pendingProfile;
    return route.fallback();
  });
  await page.goto("/dashboard");
  try {
    await expect(page.getByRole("status", { name: "Загрузка обзора профиля" })).toBeVisible();
    await expect(accountNavigation(page).getByRole("link", { name: "Мои товары" })).toBeVisible();
    expect((await page.getByRole("status", { name: "Загрузка обзора профиля" }).boundingBox())!.height).toBeLessThan(180);
    state.profileStatus = 500;
  } finally {
    releaseProfile();
  }
  await expect(page.getByRole("alert").filter({ hasText: "Не удалось загрузить профиль" })).toBeVisible();
  await expect(accountNavigation(page).getByRole("link")).toHaveCount(6);
  await expectNoOverflow(page);
  const readsBeforeRetry = state.profileReads;
  state.profileStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(profile(page)).toBeVisible();
  expect(state.profileReads).toBeGreaterThan(readsBeforeRetry);
  expect(state.writes).toEqual([]);
});

test("dashboard rating handles empty, populated and incomplete data", async ({ page, baseURL }) => {
  const state = await setupDashboard(page, baseURL);
  for (const ratingCase of [
    { totalReviews: 0, averageRating: 0, text: "Пока нет отзывов" },
    { totalReviews: 12, averageRating: 4.8, text: "4.812 отзывов" },
    { totalReviews: undefined, averageRating: 4.8, text: null },
    { totalReviews: 12, averageRating: null, text: null },
    { totalReviews: -1, averageRating: 4.8, text: null },
  ]) {
    state.user = { ...user, totalReviews: ratingCase.totalReviews, averageRating: ratingCase.averageRating };
    await page.goto("/dashboard");
    await expect(profile(page)).toBeVisible();
    const rating = page.getByTestId("mobile-profile-rating");
    if (ratingCase.text === null) await expect(rating).toHaveCount(0);
    else await expect(rating).toHaveText(ratingCase.text);
  }
});

test("dashboard adapts through all breakpoints without losing the editing form", async ({ page, baseURL }) => {
  const state = await setupDashboard(page, baseURL);
  state.user.login = "ОченьДлинноеИмяПользователяБезПробеловДляПроверкиПереноса";
  await page.goto("/dashboard");
  await expect(profile(page)).toBeVisible();
  for (const width of [320, 393, 599, 600, 768, 899, 900, 1376]) {
    await page.setViewportSize({ width, height: 727 });
    await expectNoOverflow(page);
    const progress = page.getByText("Заполненность профиля", { exact: true });
    if (width < 900) {
      await expect(accountNavigation(page)).toBeVisible();
      await expect(progress).toBeHidden();
      await expect(profile(page).locator(".MuiAvatar-root")).toHaveCSS("width", "60px");
      await expect(profile(page).getByRole("button", { name: "Редактировать профиль" })).toHaveCount(1);
    } else {
      await expect(accountNavigation(page)).toBeHidden();
      await expect(progress).toBeVisible();
      await expect(page.locator("main").getByRole("link", { name: /Избранное/ })).toBeVisible();
      await expect(profile(page).locator(".MuiAvatar-root")).toHaveCSS("width", "118px");
    }
  }
  await page.setViewportSize({ width: 393, height: 727 });
  await profile(page).getByRole("button", { name: "Редактировать профиль" }).click();
  await expect(accountNavigation(page)).toHaveCount(0);
  const login = page.getByRole("textbox", { name: "Логин", exact: true });
  await login.fill("updated-mobile-user");
  for (const width of [599, 600, 899, 900, 393]) {
    await page.setViewportSize({ width, height: 727 });
    await expect(login).toHaveValue("updated-mobile-user");
  }
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(accountNavigation(page)).toBeVisible();
  expect(state.writes).toEqual([]);
  await profile(page).getByRole("button", { name: "Редактировать профиль" }).click();
  await login.fill("updated-mobile-user");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(accountNavigation(page)).toBeVisible();
  await expect(profile(page).getByRole("heading")).toHaveText("updated-mobile-user");
  expect(state.writes).toEqual([{
    login: "updated-mobile-user", fullName: user.fullName, phoneNumber: "",
    imageId: null, deadlineSending: 0, deadlinePayment: 0,
  }]);
});

test("dashboard logout clears the session and a new login loads fresh profile data", async ({ page, baseURL }) => {
  const state = await setupDashboard(page, baseURL);
  await page.goto("/dashboard");
  await expect(profile(page)).toBeVisible();
  await accountNavigation(page).getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/);
  expect((await page.context().cookies()).filter((cookie) => ["access_token", "refresh_token"].includes(cookie.name))).toEqual([]);
  const readsBeforeLogin = state.profileReads;
  state.user.login = "another-mobile-user";
  await page.getByLabel(/^Email/).fill(user.mail);
  await page.getByLabel(/^Пароль/).fill("test-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/" || url.pathname === "/dashboard");
  if (new URL(page.url()).pathname === "/") await bottomNavigation(page).getByRole("link", { name: "Профиль", exact: true }).click();
  await expect(profile(page).getByRole("heading")).toHaveText("another-mobile-user");
  expect(state.profileReads).toBeGreaterThan(readsBeforeLogin);
  await expect(accountNavigation(page).getByRole("button", { name: "Выйти", exact: true })).toBeEnabled();
});
