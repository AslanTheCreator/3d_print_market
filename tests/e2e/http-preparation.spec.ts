import { expect, test, type Route } from "@playwright/test";

const json = (route: Route, body: unknown, status = 200) => route.fulfill({
  status: route.request().method() === "OPTIONS" ? 204 : status,
  headers: {
    "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  },
  contentType: "application/json",
  body: route.request().method() === "OPTIONS" ? "" : JSON.stringify(body),
});
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(yes => { resolve = yes; });
  return { promise, resolve };
};

test("config timeout releases login, cancels fetch and allows a successful retry", async ({ page }) => {
  const gate = deferred();
  let ready = false;
  let configs = 0;
  let logins = 0;
  let configAborted = false;
  page.on("requestfailed", request => {
    if (new URL(request.url()).pathname === "/api/config") configAborted = true;
  });
  await page.clock.install();
  await page.route("https://mc.yandex.ru/**", route => route.abort());
  await page.route("**/api/config", async route => {
    configs++;
    if (!ready) await gate.promise;
    await json(route, { apiUrl: "http://127.0.0.1:9" });
  });
  await page.route("http://127.0.0.1:9/**", route => {
    if (new URL(route.request().url()).pathname === "/auth/login") {
      if (route.request().method() !== "OPTIONS") logins++;
      return json(route, { access_token: "fixture-access", refresh_token: "fixture-refresh" });
    }
    return json(route, []);
  });
  try {
    await page.goto("/auth/login?redirect=%2Fabout");
    await page.getByLabel(/^Email/).fill("fixture@example.test");
    await page.getByLabel(/^Пароль/).fill("password");
    const submit = page.locator('form button[type="submit"]');
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect.poll(() => configs).toBe(1);
    await page.clock.fastForward(10001);
    await expect(submit).toBeEnabled();
    await expect(page.getByText("Ошибка авторизации. Проверьте логин и пароль.")).toBeVisible();
    await expect.poll(() => configAborted).toBe(true);
    expect(logins).toBe(0);
    ready = true;
    gate.resolve();
    await submit.click();
    await expect(page).toHaveURL(/\/about$/);
    expect(configs).toBe(2);
    expect(logins).toBe(1);
  } finally { gate.resolve(); }
});

test("same-origin proxy refresh replays concurrent protected requests without duplicating the prefix", async ({ page, context, baseURL }) => {
  const gate = deferred();
  const sent: { path: string; authorization: string | undefined }[] = [];
  const unauthorized = new Set<string>();
  let refreshes = 0;
  let configs = 0;
  await context.addCookies([
    { name: "access_token", value: "old", url: baseURL! },
    { name: "refresh_token", value: "refresh", url: baseURL! },
    { name: "token_created_at", value: String(Date.now()), url: baseURL! },
  ]);
  await page.route("https://mc.yandex.ru/**", route => route.abort());
  await page.route("**/api/config", route => {
    configs++;
    return json(route, { apiUrl: "/proxy/" });
  });
  await page.route("**/proxy/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const authorization = route.request().headers().authorization;
    sent.push({ path, authorization });
    if (path === "/proxy/auth/refresh") {
      refreshes++;
      await gate.promise;
      return json(route, "fresh");
    }
    if (["/proxy/auth/profile", "/proxy/basket/find", "/proxy/address"].includes(path) && authorization === "Bearer old") {
      unauthorized.add(path);
      return json(route, { code: "TOKEN_INVALID_OR_EXPIRED", message: "Expired", status: 401 }, 401);
    }
    return json(route, path === "/proxy/auth/profile" ? {
      id: 1, fullName: "Fixture", login: "fixture", role: "USER", email: "fixture@example.test",
      imageId: null, image: [], exp: 0, type: "access",
    } : []);
  });
  try {
    await page.goto("/checkout");
    await expect.poll(() => unauthorized.size).toBeGreaterThanOrEqual(2);
    await expect.poll(() => refreshes).toBe(1);
    gate.resolve();
    await expect.poll(() => sent.filter(s => s.authorization === "Bearer fresh").length).toBeGreaterThanOrEqual(2);
    for (const path of unauthorized) {
      await expect.poll(() => sent.some(s => s.path === path && s.authorization === "Bearer fresh")).toBe(true);
    }
    expect(sent.some(s => s.path.includes("/proxy/proxy/"))).toBe(false);
    expect(configs).toBe(1);
    expect(refreshes).toBe(1);
    await expect(page).toHaveURL(/\/checkout$/);
  } finally { gate.resolve(); }
});
