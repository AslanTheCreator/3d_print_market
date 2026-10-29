import { expect, test, type Page } from "@playwright/test";
import { giveawayFixture, giveawayNow, giveawayProduct, setupGiveaway } from "./helpers/giveaway";
import { expectNoOverflow, fulfillJson } from "./helpers/mobileAccount";

const card = (page: Page) => page.getByRole("region", { name: "Розыгрыш на главной", exact: true });
const join = (page: Page) => page.getByRole("link", { name: "Участвовать в Telegram", exact: true });
const detail = "/giveaways/8101";
const detailPath = "/giveaways/products/8101";

async function pauseClock(page: Page, state: { now: number }) {
  // Гидратация уже подтверждена UI; фиксируем момент до первой границы, без реального ожидания.
  state.now = giveawayNow + 30_000;
  await page.clock.pauseAt(new Date(state.now));
}
const retryCatalog = (page: Page) => page.getByTestId("error-state-products").getByRole("button", { name: "Обновить", exact: true }).click();

async function readOnClock(page: Page, path: string, action: () => Promise<unknown>) {
  const response = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === path);
  await action();
  await (await response).finished();
  // TanStack Query доставляет результат через setTimeout(0); часы остаются остановлены.
  await page.clock.runFor(0);
}

async function focus(page: Page) { await page.evaluate(() => window.dispatchEvent(new Event("focus"))); }
async function visibility(page: Page, value: "hidden" | "visible") {
  await page.evaluate(value => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, value);
}

test("scheduled home giveaway crosses start once, updates countdown and never polls between boundaries", async ({ page }) => {
  const state = await setupGiveaway(page, { controlledClock: true });
  state.active = giveawayFixture({ startAt: new Date(giveawayNow + 60_000).toISOString(), status: "AWAITING_GIVEAWAY" });
  await page.goto("/");
  await expect(card(page).getByRole("heading", { name: "Серверный приз" })).toBeVisible();
  await pauseClock(page, state);
  await expect(card(page).getByRole("timer", { name: "До начала", exact: true })).toHaveText("До начала: 00:00:30");
  expect(state.reads).toEqual(["/giveaways/active"]);
  state.now += 20_000; await page.clock.runFor(20_000);
  await expect(card(page).getByRole("timer")).toHaveText("До начала: 00:00:10");
  expect(state.reads).toHaveLength(1);
  state.now += 10_000; await readOnClock(page, "/giveaways/active", () => page.clock.runFor(10_000));
  await expect(card(page).getByRole("timer", { name: "До завершения", exact: true })).toHaveText("До завершения: 00:02:00");
  await expect.poll(() => state.reads.length).toBe(2);
  state.now += 10_000; await page.clock.runFor(10_000);
  expect(state.reads).toHaveLength(2);
  expect(state.productReads).toEqual([]);
});

test("direct link loads public fields, crosses start/end, then distinguishes completion from initial 404", async ({ page }) => {
  const state = await setupGiveaway(page, { controlledClock: true });
  state.details.set(8101, giveawayFixture({ startAt: new Date(giveawayNow + 60_000).toISOString(), status: "AWAITING_GIVEAWAY" }));
  await page.goto(detail);
  await expect(page.getByRole("heading", { name: "Серверный приз", exact: true })).toBeVisible();
  await pauseClock(page, state);
  for (const text of ["Описание настоящего приза", "Серверный текст на главной", "Условия участия из API", "Число победителей: 2"])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.locator("time")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Розыгрыш в Telegram", exact: true })).toHaveAttribute("href", "https://t.me/figurzilla_giveaway");
  await expect(join(page)).toHaveCount(0);
  state.now += 30_000; await readOnClock(page, detailPath, () => page.clock.runFor(30_000));
  await expect(join(page)).toBeVisible();
  expect(state.reads).toEqual([detailPath, detailPath]);
  state.now += 120_000; await readOnClock(page, detailPath, () => page.clock.runFor(120_000));
  await expect(page.getByRole("heading", { name: "Розыгрыш завершён", exact: true })).toBeVisible();
  await expect(join(page)).toHaveCount(0);
  expect(state.reads).toEqual([detailPath, detailPath, detailPath]);
  expect(state.productReads).toEqual([]); expect(state.writes).toEqual([]);
});

test("home drops the ended card and accepts the next scheduled response from active", async ({ page }) => {
  const state = await setupGiveaway(page, { controlledClock: true });
  const end = giveawayNow + 180_000;
  await page.goto("/"); await expect(card(page)).toContainText("Серверный приз");
  await pauseClock(page, state);
  state.active = giveawayFixture({ productId: 8102, name: "Следующий приз", startAt: new Date(end + 60_000).toISOString(), endAt: new Date(end + 360_000).toISOString() });
  const elapsed = end - state.now; state.now = end; await readOnClock(page, "/giveaways/active", () => page.clock.runFor(elapsed));
  await expect(card(page)).toContainText("Следующий приз");
  await expect(card(page)).not.toContainText("Серверный приз");
  await expect(card(page).getByRole("link")).toHaveAttribute("href", "/giveaways/8102");
  await expect(card(page).getByRole("timer", { name: "До начала", exact: true })).toBeVisible();
  expect(state.reads).toHaveLength(2);
});

for (const screen of ["home", "detail"] as const) test(`${screen}: even a stale successful response cannot restore participation after end`, async ({ page }) => {
  const state = await setupGiveaway(page, { controlledClock: true }); state.computeWindow = false;
  await page.goto(screen === "home" ? "/" : detail);
  if (screen === "home") await expect(card(page)).toBeVisible(); else await expect(join(page)).toBeVisible();
  await pauseClock(page, state);
  const elapsed = giveawayNow + 180_000 - state.now; state.now += elapsed;
  await readOnClock(page, screen === "home" ? "/giveaways/active" : detailPath, () => page.clock.runFor(elapsed));
  await expect.poll(() => state.reads.length).toBe(2);
  if (screen === "home") await expect(card(page)).toHaveCount(0);
  else { await expect(page.getByText("Розыгрыш завершён", { exact: true })).toBeVisible(); await expect(join(page)).toHaveCount(0); }
  await page.clock.runFor(30_000); expect(state.reads).toHaveLength(2);
});

test("resume from a background tab rechecks real time and the endpoint without executing every missed tick", async ({ page }) => {
  const state = await setupGiveaway(page, { controlledClock: true });
  await page.goto(detail); await expect(join(page)).toBeVisible();
  await pauseClock(page, state);
  await visibility(page, "hidden");
  state.now = giveawayNow + 600_000; await page.clock.setSystemTime(new Date(state.now));
  await readOnClock(page, detailPath, () => visibility(page, "visible"));
  await expect(page.getByRole("heading", { name: "Розыгрыш завершён", exact: true })).toBeVisible();
  expect(state.reads).toEqual([detailPath, detailPath]);
  await page.clock.runFor(30_000); expect(state.reads).toHaveLength(2);
});

test("disabled before end becomes unavailable on focus; initial 404 never guesses a reason and can recover", async ({ page }) => {
  const state = await setupGiveaway(page);
  await page.goto(detail); await expect(join(page)).toBeVisible();
  state.detailStatus = 404; await focus(page);
  await expect(page.getByRole("heading", { name: "Розыгрыш недоступен", exact: true })).toBeVisible();
  await expect(join(page)).toHaveCount(0);
  await expect(page.getByText("Розыгрыш завершён", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Розыгрыш недоступен", exact: true })).toBeVisible();
  state.detailStatus = 200; await focus(page); await expect(join(page)).toBeVisible();
});

test("giveaway 404 leaves no leading grid cell and is independent of a successful ordinary catalog", async ({ page }) => {
  const state = await setupGiveaway(page); state.activeStatus = 404;
  state.products = [{ ...giveawayProduct, id: 8201, name: "Обычный товар", availability: "PURCHASABLE", price: 1500 }];
  await page.goto("/");
  await retryCatalog(page);
  await expect(page.getByRole("link", { name: /Обычный товар/ })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByLabel("Загрузка розыгрыша", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Не удалось загрузить розыгрыш.", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("error-state-products")).toHaveCount(0);
  const grid = page.locator('a[href="/catalog/8201/detail"]').locator("../../../..");
  await expect(grid.locator(":scope > *")).toHaveCount(1);
});

for (const network of [false, true]) test(`public giveaway error network=${network} keeps catalog and supports an explicit retry`, async ({ page }) => {
  const state = await setupGiveaway(page);
  state.activeStatus = network ? 200 : 503; state.networkFailure = network;
  state.products = [{ ...giveawayProduct, id: 8201, name: "Обычный товар", availability: "PURCHASABLE", price: 1500 }];
  await page.goto("/");
  await retryCatalog(page);
  await expect(page.getByRole("link", { name: /Обычный товар/ })).toBeVisible();
  await expect(page.getByText("Не удалось загрузить розыгрыш.", { exact: true })).toBeVisible();
  state.activeStatus = 200; state.networkFailure = false;
  await page.getByRole("button", { name: "Повторить загрузку розыгрыша", exact: true }).click();
  await expect(card(page)).toContainText("Серверный приз");
  expect(state.productReads).toEqual([]);
});

test("catalog failure cannot hide a successful giveaway and its direct navigation", async ({ page }) => {
  const state = await setupGiveaway(page); state.catalogStatus = 503;
  await page.goto("/");
  await expect(page.getByTestId("error-state-products")).toBeVisible();
  await expect(card(page)).toContainText("Серверный приз");
  await card(page).getByRole("link", { name: "Подробнее о розыгрыше", exact: true }).click();
  await expect(page).toHaveURL(/\/giveaways\/8101$/); await expect(join(page)).toBeVisible();
  expect(state.productReads).toEqual([]);
});

for (const metadataStatus of [404, 503]) test(`detail network error has retry; metadata ${metadataStatus} stays local and retries without rereading giveaway`, async ({ page }) => {
  const state = await setupGiveaway(page); state.networkFailure = true;
  await page.goto(detail);
  await expect(page.getByRole("heading", { name: "Не удалось загрузить розыгрыш", exact: true })).toBeVisible();
  state.networkFailure = false; state.metadataStatus = metadataStatus;
  await page.getByRole("button", { name: "Обновить розыгрыш", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Серверный приз", exact: true })).toBeVisible();
  await expect(join(page)).toHaveAttribute("rel", "noopener noreferrer");
  await expect(join(page)).toHaveAttribute("target", "_blank");
  await expect(page.getByText("Изображения недоступны.", { exact: true })).toBeVisible();
  const reads = state.reads.length; state.metadataStatus = 200;
  await page.getByRole("button", { name: "Повторить загрузку изображений", exact: true }).click();
  await expect(page.getByRole("img", { name: "Серверный приз 1", exact: true }).first()).toBeVisible();
  expect(state.reads).toHaveLength(reads); expect(state.productReads).toEqual([]);
});

for (const url of ["javascript:alert(1)", "https://t.me.evil.test/prize"]) test(`unsafe Telegram is never an actionable link: ${url}`, async ({ page }) => {
  const state = await setupGiveaway(page); state.details.get(8101)!.telegramUrl = url;
  await page.goto(detail);
  await expect(page.getByText("Ссылка на Telegram недоступна.", { exact: true })).toBeVisible();
  await expect(join(page)).toHaveCount(0);
  await expect(page.locator(`a[href="${url}"]`)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Участие пока недоступно", exact: true })).toBeDisabled();
});

test("home image failure keeps the card readable and image retry reachable on a narrow screen", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 900 });
  const state = await setupGiveaway(page); state.metadataStatus = 404;
  await page.goto("/");
  await expect(card(page).getByText("Изображения недоступны.", { exact: true })).toBeVisible();
  const retry = card(page).getByRole("button", { name: "Повторить загрузку изображений", exact: true });
  await expect(retry).toBeVisible();
  const bounds = await retry.boundingBox(), cardBounds = await card(page).boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(cardBounds!.x);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(cardBounds!.x + cardBounds!.width);
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("giveaway-home-image-error.png"), fullPage: true });
  state.metadataStatus = 200; await retry.click();
  await expect(card(page).getByRole("img", { name: "Серверный приз", exact: true })).toBeVisible();
});

test("B3 sparse fields and empty images remain readable without inventing purchase fields", async ({ page }) => {
  const state = await setupGiveaway(page);
  state.details.set(8101, giveawayFixture({ productId: null, name: null, description: null, imageIds: [], telegramUrl: "https://telegram.me/prize" }));
  await page.goto(detail);
  await expect(page.getByRole("heading", { name: "Розыгрыш", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Изображение недоступно", exact: true })).toBeVisible();
  await expect(join(page)).toHaveAttribute("href", "https://telegram.me/prize");
  expect(state.metadataReads).toEqual([]);
  await expect(page.getByRole("button", { name: /Купить|Добавить в корзину|Предзаказать/ })).toHaveCount(0);
  expect(state.productReads).toEqual([]); expect(state.writes).toEqual([]);
});

for (const width of [393, 1280]) test(`long server content and missing metadata stay usable at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  const state = await setupGiveaway(page);
  const text = "ДлинныйТекстБезПробелов".repeat(20);
  state.details.set(8101, giveawayFixture({ name: text, description: text, homeText: text, rules: `${text}\n<script>unsafe()</script>`, imageIds: [] }));
  await page.goto(detail);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(text);
  await expect(page.getByText(/<script>unsafe\(\)<\/script>/)).toBeVisible();
  await expect(join(page)).toBeVisible(); await expectNoOverflow(page);
  const bounds = await join(page).boundingBox(); expect(bounds!.height).toBeGreaterThanOrEqual(44);
  expect(await page.locator("script").filter({ hasText: /^unsafe\(\)$/ }).count()).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("giveaway-details.png"), fullPage: true });
});

for (const width of [393, 1280]) test(`home card preserves long server text, empty images and a usable details link at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  const state = await setupGiveaway(page);
  state.active = giveawayFixture({ name: "ДлинноеНазваниеБезПробелов".repeat(8), homeText: "ТекстУсловийБезПробелов".repeat(20), imageIds: [] });
  await page.goto("/");
  await expect(card(page).getByRole("heading")).toHaveText(state.active.name!);
  await expect(card(page).getByRole("img", { name: "Изображение недоступно", exact: true })).toBeVisible();
  const link = card(page).getByRole("link", { name: "Подробнее о розыгрыше", exact: true });
  await expect(link).toBeVisible();
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("giveaway-home.png"), fullPage: true });
});

test("home removes a disabled giveaway on focus and reads again after reopening", async ({ page }) => {
  const state = await setupGiveaway(page);
  await page.goto("/"); await expect(card(page)).toBeVisible();
  await retryCatalog(page);
  state.activeStatus = 404; await focus(page);
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Товары не найдены", exact: true })).toBeVisible();
  await expect(page.getByText("Не удалось загрузить розыгрыш.", { exact: true })).toHaveCount(0);
  state.activeStatus = 200; await page.reload(); await expect(card(page)).toBeVisible();
  expect(state.reads).toEqual(["/giveaways/active", "/giveaways/active", "/giveaways/active"]);
});

test("invalid route IDs never request either giveaway or product details", async ({ page }) => {
  const state = await setupGiveaway(page);
  for (const id of ["0", "-1", "1.5", "1e3", "9007199254740992", "invalid"]) {
    await page.goto(`/giveaways/${id}`);
    await expect(page.getByRole("heading", { name: /не найдена/i })).toBeVisible();
  }
  expect(state.reads).toEqual([]); expect(state.productReads).toEqual([]);
});

for (const authenticated of [false, true]) test(`GIVEAWAY list DTO cannot buy or use cart counters; ordinary types keep their actions, auth=${authenticated}`, async ({ page, baseURL }) => {
  const state = await setupGiveaway(page, { authenticated, baseURL });
  state.products = [giveawayProduct, { ...giveawayProduct, id: 8201, name: "Обычный товар", availability: "PURCHASABLE", price: 1500 }, { ...giveawayProduct, id: 8202, name: "Предзаказ", availability: "PREORDER", price: 2500 }];
  await page.goto("/catalog/search?query=prizes");
  const prize = page.locator('a[href="/giveaways/8101"]').filter({ hasText: "Приз из списка" }).locator("..");
  await expect(prize.getByText("Розыгрыш", { exact: true })).toBeVisible();
  await expect(prize.getByRole("link", { name: "К розыгрышу", exact: true })).toBeVisible();
  await expect(prize.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Купить", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Предзаказать", exact: true })).toBeVisible();
  await prize.getByRole("link", { name: "К розыгрышу", exact: true }).click();
  await expect(page).toHaveURL(/\/giveaways\/8101$/); await expect(join(page)).toBeVisible();
  expect(state.productReads).toEqual([]); expect(state.writes).toEqual([]);
});

test("own giveaway list card is read-only, labelled and linked to the public giveaway", async ({ page, baseURL }) => {
  const state = await setupGiveaway(page, { authenticated: true, baseURL });
  await page.route("**/products/my", route => fulfillJson(route, [giveawayProduct]));
  await page.goto("/dashboard/products");
  const prize = page.locator('a[href="/giveaways/8101"]').filter({ hasText: "Приз из списка" });
  await expect(prize).toBeVisible();
  await expect(prize.getByText("Розыгрыш", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Редактировать/ })).toHaveCount(0);
  await expect(prize.getByText("Количество не ограничено", { exact: true })).toHaveCount(0);
  expect(state.productReads).toEqual([]);
});

test("late old detail GET cannot replace another giveaway after client navigation", async ({ page }) => {
  const state = await setupGiveaway(page);
  const second = giveawayFixture({ productId: 8102, name: "Второй приз" }); state.active = second; state.details.set(8102, second);
  await page.goto(detail); await expect(join(page)).toBeVisible();
  let started!: () => void, release!: () => void, finished!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const completed = new Promise<void>(resolve => { finished = resolve; });
  await page.route("**/giveaways/products/8101", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    started(); await gate;
    try { await fulfillJson(route, giveawayFixture({ name: "Поздний старый приз" })); }
    catch (error) { if (!route.request().failure()) throw error; }
    finally { finished(); }
  });
  await focus(page); await began;
  try {
    await page.getByRole("link", { name: "На главную", exact: true }).click();
    await expect(card(page)).toContainText("Второй приз");
    await card(page).getByRole("link", { name: "Подробнее о розыгрыше", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Второй приз", exact: true })).toBeVisible();
  } finally { release(); }
  await completed;
  await expect(page.getByRole("heading", { name: "Второй приз", exact: true })).toBeVisible();
  await expect(page.getByText("Поздний старый приз", { exact: true })).toHaveCount(0);
  expect(state.productReads).toEqual([]);
});
