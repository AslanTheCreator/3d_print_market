import { expect, test, type Page } from "@playwright/test";
import { connectDev } from "./backend.mjs";
import { blockExternalTelemetry } from "./network";

type NetworkEntry = { path: string; method: string; origin?: string; requestedMethod?: string; requestedHeaders?: string; status?: number };

async function observeBackend(page: Page) {
  const session = await blockExternalTelemetry(page);
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  const entries = new Map<string, NetworkEntry>();
  session.on("Network.requestWillBeSent", ({ requestId, request }) => {
    const url = new URL(request.url);
    if (url.origin !== "http://localhost:8081") return;
    const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
    // Только безопасные metadata; Authorization, refresh token, query и body не сохраняем.
    entries.set(requestId, { path: url.pathname, method: request.method, origin: headers.origin,
      requestedMethod: headers["access-control-request-method"], requestedHeaders: headers["access-control-request-headers"] });
  });
  session.on("Network.responseReceived", ({ requestId, response }) => {
    const entry = entries.get(requestId);
    if (entry) entry.status = response.status;
  });
  return () => [...entries.values()];
}

async function login(page: Page, role: "buyer" | "seller", path: string) {
  await page.goto(`/auth/login?redirect=${encodeURIComponent(path)}`);
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return form && Object.keys(form).some(key => key.startsWith("__reactProps$"));
  });
  const prefix = role === "buyer" ? "CODEX_TEST_SELLER" : "CODEX_TEST_BUYER";
  await page.getByLabel(/^Email/).fill(process.env[`${prefix}_LOGIN`]!);
  await page.getByLabel(/^Пароль/).fill(process.env[`${prefix}_PASSWORD`]!);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(`http://localhost:3000${path}`);
}

async function browserProduct(page: Page, path: string, method = "GET", body?: object) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.cookie.split("; ").find(value => value.startsWith("access_token="))?.slice("access_token=".length);
    const response = await fetch(`http://localhost:8081${path}`, {
      method, headers: { Authorization: `Bearer ${decodeURIComponent(token ?? "")}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const raw = await response.text();
    let data; try { data = JSON.parse(raw); } catch { data = null; }
    return { status: response.status, id: typeof data === "number" ? data : data?.id, name: data?.name, price: data?.price };
  }, { path, method, body });
}

for (const mobile of [false, true]) test.describe(mobile ? "mobile without interception" : "desktop without interception", () => {
  test.use({ viewport: mobile ? { width: 393, height: 727 } : { width: 1280, height: 900 }, isMobile: mobile, hasTouch: mobile });
  let dev: Awaited<ReturnType<typeof connectDev>>;
  test.beforeAll(async () => { dev = await connectDev(); });
  test.afterAll(async () => { if (dev) await dev.save(); });

  test("browser CRUD persists on backend and observes genuine successful preflights", async ({ page }, testInfo) => {
    const network = await observeBackend(page);
    await login(page, "seller", "/dashboard/products");
    const body = { name: `[ТЕСТ ${dev.marker}] browser CRUD ${mobile ? "mobile" : "desktop"}`, description: "Synthetic DEV fixture",
      price: 100, count: 2, currency: "RUB", originality: "TEST", availability: "PURCHASABLE", categoryIds: [132], imageIds: [] };
    const created = await browserProduct(page, "/products", "POST", body);
    expect(created.status).toBe(200);
    expect(Number.isSafeInteger(created.id)).toBe(true);
    const id = created.id as number;
    dev.manifest.products.push(id);
    await dev.save();
    try {
      expect(dev.success(await dev.request(null, `/product/${id}`)).name).toBe(body.name);
      expect((await browserProduct(page, `/product/${id}`)).name).toBe(body.name);
      expect((await browserProduct(page, `/product/${id}`, "PUT", { ...body, price: 125 })).status).toBe(200);
      expect(dev.success(await dev.request(null, `/product/${id}`)).price).toBe(125);
      expect((await browserProduct(page, `/product/${id}`)).price).toBe(125);
    } finally {
      expect((await browserProduct(page, `/product/${id}`, "DELETE")).status).toBe(200);
      expect((await dev.request(null, `/product/${id}`)).status).toBe(404);
    }
    const preflights = network().filter(entry => entry.method === "OPTIONS");
    expect(preflights).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "/auth/login", origin: "http://localhost:3000", requestedMethod: "POST", status: 200 }),
      expect.objectContaining({ path: "/products", requestedMethod: "POST", status: 200 }),
      expect.objectContaining({ path: `/product/${id}`, requestedMethod: "PUT", status: 200 }),
    ]));
    expect(preflights.some(entry => entry.status === 204)).toBe(false);
    await testInfo.attach("backend-network-metadata", { body: JSON.stringify(network()), contentType: "application/json" });
  });

  test("known backend refresh CORS 403 blocks the real interceptor and ends the session", async ({ page }, testInfo) => {
    const network = await observeBackend(page);
    const id = await dev.order(await dev.product());
    await login(page, "buyer", "/dashboard/purchase");
    const details = page.getByTestId(mobile ? "mobile-orders" : "desktop-orders").getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true }).first();
    await expect(details).toBeVisible();
    const cookies = await page.context().cookies();
    expect(cookies.some(cookie => cookie.name === "refresh_token" && !!cookie.value)).toBe(true);
    await page.context().addCookies([{ name: "access_token", value: "p2-invalid-access-token", url: "http://localhost:3000" }]);
    await details.click();
    await expect(page).toHaveURL("http://localhost:3000/auth/login");
    expect(network()).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: `/order/${id}/cases`, method: "GET", status: 401 }),
      expect.objectContaining({ path: "/auth/refresh", method: "OPTIONS", origin: "http://localhost:3000", requestedMethod: "POST", requestedHeaders: "x-refresh-token", status: 403 }),
    ]));
    expect(network().filter(entry => entry.path === "/auth/refresh" && entry.method === "POST" && entry.status !== undefined)).toEqual([]);
    expect(network().filter(entry => entry.path === `/order/${id}/cases` && entry.method === "GET")).toHaveLength(1);
    expect((await page.context().cookies()).some(cookie => ["access_token", "refresh_token"].includes(cookie.name))).toBe(false);
    await testInfo.attach("backend-network-metadata", { body: JSON.stringify(network()), contentType: "application/json" });
  });
});
