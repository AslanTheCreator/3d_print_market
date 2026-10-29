import type { Page } from "@playwright/test";
import type { AdminGiveawayProduct, GiveawaySettingsValues } from "@/entities/product";
import { adminProductFixture, setupAdmin } from "./admin";
import { fulfillJson } from "./mobileAccount";

export const adminGiveawayNow = Date.parse("2027-06-01T12:00:00Z");
export const adminGiveawayFixture = (id = 8101, patch: Partial<AdminGiveawayProduct> = {}): AdminGiveawayProduct => ({
  ...adminProductFixture(id), availability: "GIVEAWAY", name: `Приз ${id}`, count: null, price: 0, status: "ACTIVE", currency: "RUB",
  giveawayEnabled: true, giveawayTelegramUrl: "https://t.me/original", giveawayStartAt: "2027-06-01T15:00:00+03:00",
  giveawayEndAt: "2027-06-02T15:00:00+03:00", giveawayWinnersCount: 2, giveawayRules: "Исходные правила", giveawayHomeText: "Исходный текст", ...patch,
});
export const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
export async function setupAdminGiveaway(page: Page, baseURL?: string, role = "ADMIN") {
  const admin = await setupAdmin(page, baseURL, role);
  await page.clock.setFixedTime(adminGiveawayNow);
  const state = { admin, products: [adminGiveawayFixture()], readStatus: 200, historyStatus: 200, writeStatus: 200,
    writeCode: "GIVEAWAY_WINDOW_OVERLAP", abort: false, applyOnAbort: false, failAfterWrite: false,
    putGate: Promise.resolve(), detailGate: async (_id: number) => {}, reads: [] as string[], writes: [] as GiveawaySettingsValues[],
  };
  await page.route("http://127.0.0.1:9/admin/actions/giveaways/**", async route => {
    const url = new URL(route.request().url()), path = url.pathname;
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (route.request().method() === "GET") {
      state.reads.push(path + url.search);
      if (path.endsWith("/history")) {
        const pageIndex = Number(url.searchParams.get("page"));
        return fulfillJson(route, state.historyStatus === 200 ? state.products.slice(pageIndex * 50, (pageIndex + 1) * 50) : { code: "READ_FAILED", message: "История недоступна" }, state.historyStatus);
      }
      const id = Number(path.split("/").pop()), product = state.products.find(item => item.id === id);
      const data = structuredClone({ product, imageIds: [], categories: [{ id: 1, name: "Фигурки" }] });
      const status = product ? state.readStatus : 404;
      await state.detailGate(id);
      return fulfillJson(route, status === 200 ? data : { code: "READ_FAILED", message: "Детали недоступны" }, status);
    }
    const input = route.request().postDataJSON() as GiveawaySettingsValues;
    state.writes.push(input); await state.putGate;
    const product = state.products.find(item => item.id === Number(path.split("/").pop()));
    if (product && state.writeStatus === 200 && (!state.abort || state.applyOnAbort)) Object.assign(product, {
      giveawayEnabled: input.enabled, giveawayTelegramUrl: input.telegramUrl, giveawayStartAt: input.startAt, giveawayEndAt: input.endAt,
      giveawayWinnersCount: input.winnersCount, giveawayRules: input.rules, giveawayHomeText: input.homeText,
    });
    if (state.failAfterWrite) state.readStatus = 500;
    if (state.abort) return route.abort("connectionfailed");
    return fulfillJson(route, state.writeStatus === 200 ? null : { code: state.writeCode, message: "Сервер отклонил настройки" }, state.writeStatus);
  });
  return state;
}
