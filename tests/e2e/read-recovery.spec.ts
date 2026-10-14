import { expect, test, type Page, type Request } from "@playwright/test";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
type ReadEntry = {
  request: Request; path: string; cursor?: number; scope: "guest" | "authorized";
  phase: "sent" | "completed" | "cancelled" | "failed"; status?: number; failure?: string;
};
const readLogs = new WeakMap<Page, ReadEntry[]>();
function observeReads(page: Page, path: string) {
  const entries: ReadEntry[] = [];
  readLogs.set(page, entries);
  page.on("request", request => {
    if (new URL(request.url()).pathname !== path || request.method() === "OPTIONS") return;
    const body = request.method() === "POST" ? request.postDataJSON() : undefined;
    entries.push({ request, path, cursor: body?.pageable?.lastId,
      scope: request.headers().authorization ? "authorized" : "guest", phase: "sent" });
  });
  page.on("response", response => {
    const entry = entries.find(item => item.request === response.request());
    if (entry) entry.status = response.status();
  });
  page.on("requestfinished", request => {
    const entry = entries.find(item => item.request === request);
    if (entry) entry.phase = "completed";
  });
  page.on("requestfailed", request => {
    const entry = entries.find(item => item.request === request);
    if (entry) {
      entry.failure = request.failure()?.errorText;
      entry.phase = entry.failure?.includes("ERR_ABORTED") ? "cancelled" : "failed";
    }
  });
  return entries;
}
test.afterEach(async ({ page }, testInfo) => {
  const entries = readLogs.get(page);
  if (entries) await testInfo.attach("read-lifecycle", {
    body: JSON.stringify(entries.map(({ request: _request, ...entry }) => entry), null, 2),
    contentType: "application/json",
  });
});
async function checkQuietInterval(page: Page) {
  await page.clock.fastForward(1500);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
}
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
    const reads = observeReads(page, "/products/find");
    let pageSize = 0;
    const initialGates = [deferred(), deferred()];
    const tailGates = [deferred(), deferred()];
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
      if (!tail) pageSize = body.pageable.size;
      if (tail) {
        const attempt = state.tailReads++;
        await (tailGates[attempt]?.promise ?? state.tailGate);
      } else {
        const attempt = state.firstReads++;
        await (initialGates[attempt]?.promise ?? Promise.resolve());
      }
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
    try {
      await expect.poll(async () => {
        if (consumer.name === "related") await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return state.firstReads;
      }).toBe(1);
      expect(reads.filter(read => read.phase === "completed")).toHaveLength(0);
      initialGates[0].resolve();
      await expect.poll(() => state.firstReads).toBe(2);
      await expect.poll(() => reads.filter(read => read.phase === "completed").length).toBe(1);
    } finally { initialGates.forEach(gate => gate.resolve()); }
    const initialError = page.getByTestId("error-state-products");
    await expect(initialError).toBeVisible();
    expect(state.firstReads).toBe(2);
    await expect.poll(() => reads.filter(read => read.phase === "completed").length).toBe(2);
    expect(reads.map(read => read.status)).toEqual([503, 503]);
    await page.clock.install();
    state.initialStatus = 200;
    await initialError.getByRole("button", { name: "Обновить", exact: true }).click();
    const card = page.getByText("Recovery 1", { exact: true });
    await expect(card).toBeVisible();
    // Keep a reference to the actual card: a hidden/recreated grid is not acceptable.
    // P06: сохранность проверяется по видимым карточкам и scroll, без требования DOM identity.
    await page.getByTestId("infinite-scroll-sentinel").evaluate(element => element.scrollIntoView());
    try {
      await expect.poll(() => state.tailReads).toBe(1);
      await expect(card).toBeVisible();
      tailGates[0].resolve();
      await expect.poll(() => state.tailReads).toBe(2);
      await expect(card).toBeVisible();
    } finally { tailGates.forEach(gate => gate.resolve()); }
    const tailError = page.getByText("Не удалось загрузить следующие товары.", { exact: true });
    await expect(tailError).toBeVisible();
    expect(state.tailReads).toBe(2);
    const scrollY = await page.evaluate(() => window.scrollY);
    await checkQuietInterval(page);
    expect(state.tailReads).toBe(2);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
    await expect(card).toBeVisible();
    await expect(page.getByText(/^Recovery \d+$/)).toHaveCount(pageSize);
    // An automatic successful refetch must not re-arm the failed tail.
    const firstReads = state.firstReads;
    await reconnect(page);
    await expect.poll(() => state.firstReads).toBe(firstReads + 1);
    await checkQuietInterval(page);
    await expect(tailError).toBeVisible();
    expect(state.tailReads).toBe(2);
    const retry = page.getByRole("button", { name: "Повторить загрузку", exact: true });
    const gate = deferred();
    state.tailGate = gate.promise;
    state.tailStatus = 200;
    await retry.click();
    try {
      await expect(page.getByRole("button", { name: "Загрузка...", exact: true })).toBeDisabled();
      await expect.poll(() => state.tailReads).toBe(3);
      await expect(card).toBeVisible();
    } finally { gate.resolve(); }
    await expect(page.getByText("Recovery хвост", { exact: true })).toBeVisible();
    expect(state.tailReads).toBe(3);
    await expect(tailError).toHaveCount(0);
    await expect(card).toBeVisible();
    await expect(page.getByText(/^Recovery \d+$/)).toHaveCount(pageSize);
    await expect(page.getByText("Recovery хвост", { exact: true })).toBeVisible();

    state.initialStatus = 503;
    await reconnect(page);
    await expect(page.getByText("Не удалось обновить товары. Показаны ранее загруженные данные.", { exact: true })).toBeVisible();
    await expect(card).toBeVisible();
    await expect(page.getByText(/^Recovery \d+$/)).toHaveCount(pageSize);
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
      await checkQuietInterval(page);
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

test("own products keep loaded pages after tail failure and retry only the failed cursor", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  observeReads(page, "/products/my");
  const state = { tailStatus: 503, tailGate: Promise.resolve(), cursors: [] as (number | undefined)[] };
  const products = Array.from({ length: 205 }, (_, index) => ({
    ...orderFixture(1, "BOOKED", 1).product, id: 10000 + index,
    name: `Мой recovery товар ${index + 1}`, imageId: 0, sellerId: 1,
  }));
  await page.route("**/products/my", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    const { pageable } = route.request().postDataJSON() as { pageable: { size: number; lastId?: number } };
    state.cursors.push(pageable.lastId);
    const failedTail = pageable.lastId === 10199;
    if (failedTail) await state.tailGate;
    const status = failedTail ? state.tailStatus : 200;
    const offset = pageable.lastId === undefined ? 0 : pageable.lastId - 9999;
    return fulfillJson(route, status === 200 ? products.slice(offset, offset + pageable.size) : { message: "Tail unavailable" }, status);
  });
  await page.goto("/dashboard/products");
  const first = page.getByText("Мой recovery товар 1", { exact: true });
  await expect(first).toBeVisible();
  await page.clock.install();
  const loadMore = page.getByRole("button", { name: "Загрузить ещё", exact: true });
  for (const count of [24, 36, 48, 60, 72, 84, 96, 100, 112, 124, 136, 148, 160, 172, 184, 196, 200]) {
    await loadMore.click();
    await expect(page.getByText(`Мой recovery товар ${count}`, { exact: true })).toBeVisible();
  }
  expect(state.cursors).toEqual([undefined, 10099]);
  const second = page.getByText("Мой recovery товар 101", { exact: true });
  await loadMore.scrollIntoViewIfNeeded();
  const scrollY = await page.evaluate(() => window.scrollY);
  await loadMore.click();
  const tailError = page.getByText("Не удалось загрузить следующие товары.", { exact: true });
  await expect(tailError).toBeVisible({ timeout: 15_000 });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await expect(page.getByText("Мой recovery товар 200", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Мой recovery товар \d+$/)).toHaveCount(200);
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  expect(state.cursors).toEqual([undefined, 10099, 10199, 10199]);
  await checkQuietInterval(page);
  expect(state.cursors).toHaveLength(4);
  await expect(loadMore).toHaveCount(0);

  await reconnect(page);
  await expect.poll(() => state.cursors.length).toBe(6);
  await expect(tailError).toBeVisible();
  expect(state.cursors).toEqual([undefined, 10099, 10199, 10199, undefined, 10099]);
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();

  const gate = deferred();
  state.tailGate = gate.promise;
  state.tailStatus = 200;
  await page.getByRole("button", { name: "Повторить загрузку", exact: true }).click();
  try {
    await expect(page.getByRole("button", { name: "Загрузка...", exact: true })).toBeDisabled();
    await expect(page.getByText("Мой recovery товар 200", { exact: true })).toBeVisible();
    await expect.poll(() => state.cursors.length).toBe(7);
  } finally { gate.resolve(); }
  await expect(page.getByText("Мой recovery товар 205", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Мой recovery товар \d+$/)).toHaveCount(205);
  await expect(tailError).toHaveCount(0);
  await expect(loadMore).toHaveCount(0);
  expect(state.cursors.slice(6)).toEqual([10199]);
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
});

test("own products distinguish initial failure from a background refresh failure", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  observeReads(page, "/products/my");
  const state = { status: 503, reads: 0, gate: Promise.resolve() };
  await page.route("**/products/my", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    state.reads++;
    await state.gate;
    return fulfillJson(route, state.status === 200 ? [{
      ...orderFixture(1, "BOOKED", 1).product, id: 11000,
      name: "Мой восстановленный товар", imageId: 0, sellerId: 1,
    }] : { message: "Own products unavailable" }, state.status);
  });
  await page.goto("/dashboard/products");
  await expect(page.getByText(/Ошибка загрузки товаров:/)).toBeVisible();
  const card = page.getByText("Мой восстановленный товар", { exact: true });
  await expect(card).toHaveCount(0);
  expect(state.reads).toBe(2);
  const initialRetry = deferred();
  state.gate = initialRetry.promise;
  state.status = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  try {
    await expect(page.getByText(/Ошибка загрузки товаров:/)).toHaveCount(0);
    await expect(card).toHaveCount(0);
    await expect.poll(() => state.reads).toBe(3);
  } finally { initialRetry.resolve(); }
  await expect(card).toBeVisible();
  state.status = 503;
  await reconnect(page);
  const warning = page.getByText("Не удалось обновить товары. Показаны ранее загруженные данные.", { exact: true });
  await expect(warning).toBeVisible();
  await expect(card).toBeVisible();
  await expect(page.getByText(/Ошибка загрузки товаров:/)).toHaveCount(0);
  await expect(page.getByText("Не удалось загрузить следующие товары.", { exact: true })).toHaveCount(0);
  await expect(card).toBeVisible();
  expect(state.reads).toBe(5);
  state.status = 200;
  await page.getByRole("button", { name: "Повторить обновление", exact: true }).click();
  await expect(warning).toHaveCount(0);
  await expect(card).toBeVisible();
  expect(state.reads).toBe(6);
  await expect(card).toBeVisible();
});

test("client product retry repeats the failed GET and keeps the action pending", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  observeReads(page, "/product/901");
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
  try {
    await expect(page.getByRole("button", { name: "Загрузка...", exact: true })).toBeDisabled();
    await expect.poll(() => reads).toBe(4);
  } finally { retryGate.resolve(); }
  await expect(page.getByRole("heading", { name: "Восстановленный клиентский товар", exact: true })).toBeVisible();
  expect(reads).toBe(4);
});

test("initial SSR product retry refreshes the route and seeds its existing client query", async ({ page, request, baseURL }) => {
  test.skip(Boolean(process.env.TEST_BASE_URL) && !process.env.PLAYWRIGHT_FIXTURE_API_URL, "SSR fixture required");
  const fixture = process.env.PLAYWRIGHT_FIXTURE_API_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_FIXTURE_API_PORT ?? Number(process.env.PLAYWRIGHT_PORT ?? 3000) + 1}`;
  const reset = await request.post(`${fixture}/__test/product-recovery?action=reset`);
  expect(reset.ok()).toBe(true);
  expect(await reset.json()).toMatchObject({ status: 503, started: 0, completed: 0, cancelled: 0, pending: 0, held: false });
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
    const hold = await request.post(`${fixture}/__test/product-recovery?status=200&hold=1`);
    expect(hold.ok()).toBe(true);
    const held = await hold.json();
    await page.getByRole("button", { name: "Обновить", exact: true }).click();
    try {
      await expect.poll(async () => (await (await request.get(`${fixture}/__test/product-recovery`)).json()).pending).toBeGreaterThan(0);
      await expect(page.getByRole("button", { name: "Загрузка...", exact: true })).toBeDisabled();
      await expect(page.getByRole("heading", { name: "Не удалось открыть товар", exact: true })).toBeVisible();
      const pending = await (await request.get(`${fixture}/__test/product-recovery`)).json();
      expect(pending.started).toBeGreaterThan(held.started);
      expect(pending.completed).toBe(held.completed);
      expect(pending.cancelled).toBe(0);
      expect(clientReads).toBe(0);
    } finally { expect((await request.post(`${fixture}/__test/product-recovery?action=release`)).ok()).toBe(true); }
    await expect(page.getByRole("heading", { name: "Восстановленный серверный товар", exact: true })).toBeVisible();
    const after = await (await request.get(`${fixture}/__test/requests`)).json();
    expect(after["/product/924"]).toBeGreaterThan(before["/product/924"]);
    expect(clientReads).toBe(0);
    await expect.poll(async () => (await (await request.get(`${fixture}/__test/product-recovery`)).json()).pending).toBe(0);
    const completed = await (await request.get(`${fixture}/__test/product-recovery`)).json();
    expect(completed.completed).toBeGreaterThan(held.completed);
    expect(completed.cancelled).toBe(0);
  } finally {
    expect((await request.post(`${fixture}/__test/product-recovery?action=reset`)).ok()).toBe(true);
    expect(await (await request.get(`${fixture}/__test/product-recovery`)).json())
      .toMatchObject({ status: 503, started: 0, completed: 0, cancelled: 0, pending: 0, held: false });
  }
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
    observeReads(page, "/participant");
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
    try {
      await expect(page.getByRole("button", { name: "Загрузка...", exact: true }).filter({ visible: true })).toBeDisabled();
      await expect.poll(() => reads).toBe(3);
    } finally { retryGate.resolve(); }
    await expect(page.getByTestId("profile-overview").getByText("recovered-profile", { exact: true })).toBeVisible();
    expect(reads).toBe(3);
  });
}
