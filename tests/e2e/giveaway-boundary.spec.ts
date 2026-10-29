import { expect, test, type Page } from "@playwright/test";
import type { GiveawayResponse } from "@/entities/product";
import { deferred } from "./helpers/adminGiveaway";
import { giveawayFixture, giveawayNow, setupGiveaway } from "./helpers/giveaway";
import { fulfillJson } from "./helpers/mobileAccount";

const card = (page: Page) => page.getByRole("region", { name: "Розыгрыш на главной", exact: true });
const join = (page: Page) => page.getByRole("link", { name: "Участвовать в Telegram", exact: true });
const focus = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event("focus")));
const pathFor = (screen: string) => screen === "home" ? "/giveaways/active" : "/giveaways/products/8101";
function observe(page: Page, path: string) {
  const reads: string[] = [];
  page.on("request", request => { if (request.method() === "GET" && new URL(request.url()).pathname === path) reads.push(request.url()); });
  return reads;
}
async function holdNext(page: Page, path: string, data: GiveawayResponse) {
  const started = deferred(), release = deferred(), finished = deferred(); let held = false;
  await page.route(`http://127.0.0.1:9${path}`, async route => {
    if (route.request().method() !== "GET" || held) return route.fallback();
    held = true; started.resolve(); await release.promise;
    try { await fulfillJson(route, data); } finally { finished.resolve(); }
  });
  return { started: started.promise, release: async () => { release.resolve(); await finished.promise; } };
}
async function flush(page: Page, path: string, action: () => Promise<unknown>) {
  const response = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === path);
  await action(); await (await response).finished(); await page.clock.runFor(0);
}

for (const screen of ["home", "detail"] as const) for (const boundary of ["start", "end"] as const) {
  test(`${screen}: boundary ${boundary} cancels a pending focus GET; its late snapshot cannot replace fresh data`, async ({ page }) => {
    const state = await setupGiveaway(page, { controlledClock: true }), path = pathFor(screen), reads = observe(page, path);
    const at = giveawayNow + 60_000;
    const old = giveawayFixture({ startAt: new Date(giveawayNow + (boundary === "start" ? 60_000 : -60_000)).toISOString(), endAt: new Date(giveawayNow + (boundary === "end" ? 60_000 : 180_000)).toISOString() });
    state.active = old; state.details.set(8101, old);
    await page.goto(screen === "home" ? "/" : "/giveaways/8101");
    await expect(page.getByRole("heading", { name: "Серверный приз", exact: true })).toBeVisible();
    state.now = giveawayNow + 30_000; await page.clock.pauseAt(new Date(state.now));
    const held = await holdNext(page, path, { ...old, name: "Устаревший ответ" }); await focus(page); await held.started;
    const fresh = boundary === "end" && screen === "home" ? giveawayFixture({ productId: 8102, name: "Следующий приз", startAt: new Date(at + 60_000).toISOString(), endAt: new Date(at + 180_000).toISOString() }) : { ...old, name: "После границы" };
    state.active = fresh; state.details.set(8101, fresh); state.now = at;
    await flush(page, path, () => page.clock.runFor(30_000));
    await expect.poll(() => reads.length).toBe(3);
    if (boundary === "end" && screen === "detail") { await expect(page.getByRole("heading", { name: "Розыгрыш завершён", exact: true })).toBeVisible(); await expect(join(page)).toHaveCount(0); }
    else {
      await expect(page.getByRole("heading", { name: fresh.name!, exact: true })).toBeVisible();
      if (screen === "detail") await expect(join(page)).toBeVisible();
      if (boundary === "end") await expect(card(page).getByRole("link")).toHaveAttribute("href", "/giveaways/8102");
    }
    await held.release(); await page.clock.runFor(0);
    await expect(page.getByRole("heading", { name: "Устаревший ответ", exact: true })).toHaveCount(0);
    await page.clock.runFor(10_000); expect(reads).toHaveLength(3);
  });

  test(`${screen}: initial GET spanning ${boundary} performs a fresh GET before publishing its data`, async ({ page }) => {
    const state = await setupGiveaway(page, { controlledClock: true }), path = pathFor(screen), reads = observe(page, path);
    const at = giveawayNow + 60_000;
    const old = giveawayFixture({ startAt: new Date(giveawayNow + (boundary === "start" ? 60_000 : -60_000)).toISOString(), endAt: new Date(giveawayNow + (boundary === "end" ? 60_000 : 180_000)).toISOString() });
    const held = await holdNext(page, path, { ...old, name: "Устаревший первый ответ" });
    await page.goto(screen === "home" ? "/" : "/giveaways/8101"); await held.started;
    state.now = at; await page.clock.pauseAt(new Date(at));
    const fresh = boundary === "end" && screen === "home" ? giveawayFixture({ productId: 8102, name: "Следующий приз", startAt: new Date(at + 60_000).toISOString() }) : { ...old, name: "После границы" };
    state.active = fresh; state.details.set(8101, fresh);
    // Первый response освобождается отдельно: ждём именно следующий GET, а не его поздний ответ.
    const nextRequest = page.waitForRequest(request => request.method() === "GET" && new URL(request.url()).pathname === path);
    await held.release(); await page.clock.runFor(0);
    await (await (await nextRequest).response())!.finished(); await page.clock.runFor(0);
    if (boundary === "end" && screen === "detail") { await expect(page.getByRole("heading", { name: "Розыгрыш недоступен", exact: true })).toBeVisible(); await expect(join(page)).toHaveCount(0); }
    else await expect(page.getByRole("heading", { name: fresh.name!, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Устаревший первый ответ", exact: true })).toHaveCount(0);
    await page.clock.runFor(10_000); expect(reads).toHaveLength(2);
  });
}

for (const screen of ["home", "detail"] as const) test(`${screen}: post-boundary error blocks participation and explicit retry recovers without polling`, async ({ page }) => {
  const state = await setupGiveaway(page, { controlledClock: true }), path = pathFor(screen), reads = observe(page, path);
  const old = giveawayFixture({ startAt: new Date(giveawayNow + 60_000).toISOString() }); state.active = old; state.details.set(8101, old);
  await page.goto(screen === "home" ? "/" : "/giveaways/8101"); await expect(page.getByRole("heading", { name: "Серверный приз", exact: true })).toBeVisible();
  state.now = giveawayNow + 30_000; await page.clock.pauseAt(new Date(state.now));
  const held = await holdNext(page, path, old); await focus(page); await held.started;
  state.activeStatus = 503; state.detailStatus = 503; state.now = giveawayNow + 60_000;
  await flush(page, path, () => page.clock.runFor(30_000));
  await expect(page.getByText(screen === "home" ? "Не удалось загрузить розыгрыш." : "Не удалось обновить розыгрыш. Участие недоступно до успешного чтения.", { exact: true })).toBeVisible();
  await held.release(); await page.clock.runFor(10_000); expect(reads).toHaveLength(3); await expect(join(page)).toHaveCount(0);
  state.activeStatus = 200; state.detailStatus = 200;
  const retry = screen === "home" ? page.getByRole("button", { name: "Повторить загрузку розыгрыша", exact: true })
    : page.getByRole("alert").filter({ hasText: "Не удалось обновить розыгрыш" }).getByRole("button", { name: "Обновить розыгрыш", exact: true });
  await flush(page, path, () => retry.click());
  if (screen === "home") await expect(card(page)).toBeVisible(); else await expect(join(page)).toBeVisible();
  expect(reads).toHaveLength(4);
});
