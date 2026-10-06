import { expect, test } from "@playwright/test";
import { setupMobileAccount } from "./helpers/mobileAccount";

test.use({ javaScriptEnabled: false });
const fixtureURL = process.env.PLAYWRIGHT_FIXTURE_API_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_FIXTURE_API_PORT ?? Number(process.env.PLAYWRIGHT_PORT ?? 3000) + 1}`;
test.skip(!!process.env.TEST_BASE_URL && !process.env.PLAYWRIGHT_FIXTURE_API_URL, "Requires local SSR API fixture");

for (const id of ["bad", "0", "1.5", "Infinity", "9007199254740992"]) test(`invalid ID ${id} produces SSR not-found without resource GET`, async ({ page, request, baseURL }, testInfo) => {
  await setupMobileAccount(page, baseURL);
  const before = await (await request.get(`${fixtureURL}/__test/requests`)).json();
  for (const path of [`/catalog/${id}/detail`, `/dashboard/products/${id}/edit`, `/admin/products/${id}`, `/admin/agents/${id}`, `/catalog/category/${id}-name`]) {
    const response = await page.goto(path);
    expect(response).not.toBeNull();
    expect([200, 404]).toContain(response!.status());
    const html = await response!.text();
    expect(html).toContain("Страница не найдена");
    expect(response!.status() === 404 || html.includes("NEXT_HTTP_ERROR_FALLBACK;404"), path).toBe(true);
    expect(/<meta name="robots" content="[^"]*noindex/.test(html), `${path}: SSR noindex`).toBe(true);
    expect(html).not.toContain('aria-label="Форма товара"');
    testInfo.annotations.push({ type: "HTTP status", description: `${path}: ${response!.status()}` });
  }
  const after = await (await request.get(`${fixtureURL}/__test/requests`)).json();
  expect(after[`/product/${id}`] ?? 0).toBe(before[`/product/${id}`] ?? 0);
});

test("core 404 is not-found; core/metadata outages remain temporary SSR errors", async ({ page }, testInfo) => {
  for (const [id, missing] of [[920, true], [921, false], [922, false]] as const) {
    const response = await page.goto(`/catalog/${id}/detail`);
    const html = await response!.text();
    expect([200, 404]).toContain(response!.status());
    expect(html).toMatch(/<meta name="robots" content="[^"]*noindex/);
    if (missing) expect(html).toContain("Страница не найдена");
    else {
      expect(response!.status()).toBe(200);
      expect(html).toContain("Товар временно недоступен");
      expect(html).toContain("Не удалось открыть товар");
      expect(html).toContain("Обновить");
      expect(html).not.toContain("Товар не найден");
    }
    testInfo.annotations.push({ type: "HTTP status", description: `product ${id}: ${response!.status()}` });
  }
});

test("empty image metadata is successful product SSR; valid category outage is not absence", async ({ page }) => {
  let response = await page.goto("/catalog/923/detail");
  expect(response!.status()).toBe(200);
  let html = await response!.text();
  expect(html).toContain("Тестовая коллекционная фигурка");
  expect(html).not.toContain("Товар временно недоступен");
  response = await page.goto("/catalog/category/32-figurki");
  expect(response!.status()).toBe(200);
  html = await response!.text();
  expect(html).not.toContain("NEXT_HTTP_ERROR_FALLBACK;404");
  expect(html).toContain("figurki");
});
