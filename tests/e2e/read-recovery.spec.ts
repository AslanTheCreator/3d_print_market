import { expect, test, type Page } from "@playwright/test";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
async function reconnect(page: Page) {
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 600_000));
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
}

const consumers = [
  { name: "home", url: "/" },
  { name: "category", url: "/catalog/category/32-figurki" },
  { name: "search", url: "/catalog/search?query=recovery" },
  { name: "seller", url: "/sellers/10" },
  { name: "related", url: "/catalog/901/detail" },
] as const;

for (const consumer of consumers) {
  test(`${consumer.name}: initial, tail and background failures preserve reads and recover`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    await page.route("http://127.0.0.1:9/product/901", route => fulfillJson(route, {
      ...orderFixture(1, "BOOKED", 1).product, id: 901, name: "Тестовая коллекционная фигурка",
      imageIds: [], reviews: [], description: "Fixture", participantId: 77,
      categories: [{ id: 32, name: "Фигурки", childs: [] }],
    }));
    await page.route("**/participants/find", route => fulfillJson(route, [{
      id: 10, login: "recovery-seller", fullName: "Seller", imageId: null,
      sellerStatus: "DEFAULT", averageRating: 5, totalReviews: 0, socialNetworks: [],
    }]));
    const state = { initialStatus: 503, tailStatus: 503, firstReads: 0, tailReads: 0,
      tailGate: Promise.resolve(), filtered: false };
    await page.route("**/products/find", async route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      const body = route.request().postDataJSON() as { pageable: { size: number; lastId?: number }; priceRange?: unknown };
      const tail = body.pageable.lastId !== undefined;
      if (tail) { state.tailReads++; await state.tailGate; } else state.firstReads++;
      const status = tail ? state.tailStatus : state.initialStatus;
      state.filtered ||= Boolean(body.priceRange);
      const products = Array.from({ length: tail ? 1 : body.pageable.size }, (_, index) => ({
        ...orderFixture(1, "BOOKED", 1).product, id: tail ? 8999 : 8000 + index,
        name: `${body.priceRange ? "После фильтра" : "Recovery"} ${tail ? "хвост" : index + 1}`,
        imageId: 0, price: 1000 + index, categories: [],
      }));
      return fulfillJson(route, status === 200 ? products : { message: "Read unavailable" }, status);
    });
    await page.goto(consumer.url);
    await expect.poll(async () => {
      if (consumer.name === "related") await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      return state.firstReads;
    }).toBe(2);
    const initialError = page.getByTestId("error-state-products");
    await expect(initialError).toBeVisible();
    expect(state.firstReads).toBe(2);
    state.initialStatus = 200;
    await initialError.getByRole("button", { name: "Обновить", exact: true }).click();
    const card = page.getByText("Recovery 1", { exact: true });
    await expect(card).toBeVisible();
    // Keep a reference to the actual card: a hidden/recreated grid is not acceptable.
    await card.evaluate(element => { (window as unknown as { recoveryCard: Element }).recoveryCard = element; });
    await page.getByTestId("infinite-scroll-sentinel").evaluate(element => element.scrollIntoView());
    const tailError = page.getByText("Не удалось загрузить следующие товары.", { exact: true });
    await expect(tailError).toBeVisible();
    expect(state.tailReads).toBe(2);
    const scrollY = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(1500);
    expect(state.tailReads).toBe(2);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
    expect(await page.evaluate(() => (window as unknown as { recoveryCard: Element }).recoveryCard.isConnected)).toBe(true);
    // An automatic successful refetch must not re-arm the failed tail.
    const firstReads = state.firstReads;
    await reconnect(page);
    await expect.poll(() => state.firstReads).toBe(firstReads + 1);
    await page.waitForTimeout(1500);
    await expect(tailError).toBeVisible();
    expect(state.tailReads).toBe(2);
    const retry = page.getByRole("button", { name: "Повторить загрузку", exact: true });
    const gate = deferred();
    state.tailGate = gate.promise;
    state.tailStatus = 200;
    await retry.click();
    await expect(page.getByRole("button", { name: "Загрузка...", exact: true })).toBeDisabled();
    gate.resolve();
    await expect(page.getByText("Recovery хвост", { exact: true })).toBeVisible();
    expect(state.tailReads).toBe(3);
    await expect(tailError).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { recoveryCard: Element }).recoveryCard.isConnected)).toBe(true);

    state.initialStatus = 503;
    await reconnect(page);
    await expect(page.getByText("Не удалось обновить товары. Показаны ранее загруженные данные.", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { recoveryCard: Element }).recoveryCard.isConnected)).toBe(true);
    expect(state.tailReads).toBe(3);
    state.initialStatus = 200;
    await page.getByRole("button", { name: "Повторить обновление", exact: true }).click();
    await expect(page.getByText("Не удалось обновить товары. Показаны ранее загруженные данные.", { exact: true })).toHaveCount(0);

    if (["category", "search", "seller"].includes(consumer.name)) {
      // A new filter has a fresh first page and its own pagination state.
      state.tailStatus = 503;
      await page.getByRole("button", { name: /^Цена/ }).first().click();
      await page.getByRole("textbox", { name: "От", exact: true }).fill("1001");
      await page.getByRole("textbox", { name: "От", exact: true }).press("Enter");
      await expect(page.getByText("После фильтра 1", { exact: true })).toBeVisible();
      expect(state.filtered).toBe(true);
      await page.getByTestId("infinite-scroll-sentinel").evaluate(element => element.scrollIntoView());
      await expect(tailError).toBeVisible();
      const reads = state.tailReads;
      await page.waitForTimeout(1500);
      expect(state.tailReads).toBe(reads);
      state.tailStatus = 200;
      await page.getByRole("button", { name: /^Цена/ }).first().click();
      await page.getByRole("textbox", { name: "От", exact: true }).fill("1002");
      await page.getByRole("textbox", { name: "От", exact: true }).press("Enter");
      await expect(tailError).toHaveCount(0);
      await page.getByTestId("infinite-scroll-sentinel").evaluate(element => element.scrollIntoView());
      await expect(page.getByText("После фильтра хвост", { exact: true })).toBeVisible();
      expect(state.tailReads).toBe(reads + 1);
    }
  });
}

test("client product retry repeats the failed GET and keeps the action pending", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  let reads = 0;
  let status = 503;
  let gate = Promise.resolve();
  await page.route("http://127.0.0.1:9/product/901", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    reads++;
    await gate;
    return fulfillJson(route, status === 200 ? {
      ...orderFixture(1, "BOOKED", 1).product, id: 901, name: "Восстановленный клиентский товар",
      imageIds: [], reviews: [], description: "Восстановление запроса", participantId: 10,
    } : { message: "Product unavailable" }, status);
  });
  await page.goto("/catalog/901/detail");
  await expect(page.getByRole("heading", { name: "Тестовая коллекционная фигурка", exact: true })).toBeVisible();
  expect(reads).toBe(0);
  await reconnect(page);
  await expect(page.getByText("Не удалось открыть товар", { exact: true })).toBeVisible();
  expect(reads).toBe(3);
  const retryGate = deferred();
  gate = retryGate.promise;
  status = 200;
  await page.getByRole("button", { name: "Обновить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Загрузка...", exact: true })).toBeDisabled();
  await expect.poll(() => reads).toBe(4);
  retryGate.resolve();
  await expect(page.getByRole("heading", { name: "Восстановленный клиентский товар", exact: true })).toBeVisible();
  expect(reads).toBe(4);
});

test("initial SSR product retry refreshes the route and seeds its existing client query", async ({ page, request, baseURL }) => {
  test.skip(Boolean(process.env.TEST_BASE_URL) && !process.env.PLAYWRIGHT_FIXTURE_API_URL, "SSR fixture required");
  const fixture = process.env.PLAYWRIGHT_FIXTURE_API_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_FIXTURE_API_PORT ?? Number(process.env.PLAYWRIGHT_PORT ?? 3000) + 1}`;
  await request.post(`${fixture}/__test/product-recovery?status=503`);
  await setupMobileAccount(page, baseURL);
  let clientReads = 0;
  await page.route("http://127.0.0.1:9/product/924", route => {
    if (route.request().method() !== "OPTIONS") clientReads++;
    return fulfillJson(route, { message: "Client must not own this retry" }, 503);
  });
  try {
    await page.goto("/catalog/924/detail");
    await expect(page.getByRole("heading", { name: "Не удалось открыть товар", exact: true })).toBeVisible();
    const before = await (await request.get(`${fixture}/__test/requests`)).json();
    await request.post(`${fixture}/__test/product-recovery?status=200&delay=500`);
    await page.getByRole("button", { name: "Обновить", exact: true }).click();
    await expect(page.getByRole("button", { name: "Загрузка...", exact: true })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Восстановленный серверный товар", exact: true })).toBeVisible();
    const after = await (await request.get(`${fixture}/__test/requests`)).json();
    expect(after["/product/924"]).toBeGreaterThan(before["/product/924"]);
    expect(clientReads).toBe(0);
  } finally { await request.post(`${fixture}/__test/product-recovery?status=503`); }
});

test("invalid product route never offers a retry", async ({ page }) => {
  await page.goto("/catalog/bad/detail");
  await expect(page.getByRole("heading", { name: /Страница не найдена/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Обновить|Повторить/ })).toHaveCount(0);
});

for (const width of [393, 1280]) {
  test(`profile retry recovers its core GET once and disables pending actions at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupMobileAccount(page, baseURL);
    let status = 503;
    let reads = 0;
    let gate = Promise.resolve();
    await page.route("http://127.0.0.1:9/participant", async route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      reads++;
      await gate;
      return fulfillJson(route, status === 200 ? {
        id: 1, login: "recovered-profile", fullName: "Профиль восстановлен", imageId: null,
        mail: "test@example.com", phoneNumber: "", status: "ACTIVE", sellerStatus: "DEFAULT",
        accounts: [], addresses: [], transfers: [], socialNetworks: [],
      } : { message: "Profile unavailable" }, status);
    });
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Повторить", exact: true }).filter({ visible: true })).toBeVisible();
    expect(reads).toBe(2);
    const retryGate = deferred();
    gate = retryGate.promise;
    status = 200;
    await page.getByRole("button", { name: "Повторить", exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole("button", { name: "Загрузка...", exact: true }).filter({ visible: true })).toBeDisabled();
    await expect.poll(() => reads).toBe(3);
    retryGate.resolve();
    await expect(page.getByTestId("profile-overview").getByText("recovered-profile", { exact: true })).toBeVisible();
    expect(reads).toBe(3);
  });
}
