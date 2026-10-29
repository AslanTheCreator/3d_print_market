import type { Page } from "@playwright/test";
import type { AdminProductDto } from "@/entities/product";
import { adminProductFixture, setupAdmin } from "./admin";
import { adminGiveawayNow, adminGiveawayFixture } from "./adminGiveaway";
import { fulfillJson } from "./mobileAccount";

export const botGiveawayFixture = (): AdminProductDto => adminGiveawayFixture(101) as AdminProductDto;

export async function setupGiveawayConversion(page: Page, baseURL?: string, role = "ADMIN") {
  const admin = await setupAdmin(page, baseURL, role);
  await page.clock.setFixedTime(adminGiveawayNow);
  const state = {
    admin, product: { ...adminProductFixture(), used: true } as AdminProductDto,
    categories: [1, 2] as number[] | null, imageIds: [77, 78] as number[] | null,
    writeStatus: 200, writeCode: "GIVEAWAY_WINDOW_OVERLAP", readStatus: 200, relationsStatus: 200,
    abort: false, applyOnAbort: false, failAfterWrite: false, putGate: Promise.resolve(),
    readGate: async (_path: string) => {}, reads: [] as string[],
    writes: [] as { path: string; body: Record<string, unknown> }[],
  };
  const response = () => ({ product: state.product, categories: state.categories?.map(id => ({ id, name: `Категория ${id}` })), imageIds: state.imageIds });
  await page.route("http://127.0.0.1:9/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    const detail = path === "/admin/actions/products/101", relations = path === "/product/101", giveaway = path === "/admin/actions/giveaways/101";
    const list = /^\/admin\/actions\/agents\/\d+\/products$/.test(path), history = path === "/admin/actions/giveaways/history";
    const write = path === "/admin/actions/agents/2/products/101" && method === "PUT" || giveaway && method === "PUT";
    if (!write && !detail && !relations && !giveaway && !list && !history && !path.startsWith("/giveaways/")) return route.fallback();
    if (method === "OPTIONS") return fulfillJson(route, null);
    if (write) {
      expectAuth(request.headers().authorization);
      const body = request.postDataJSON() as Record<string, unknown>; state.writes.push({ path, body });
      await state.putGate;
      if (state.writeStatus === 200 && (!state.abort || state.applyOnAbort)) {
        const settings = giveaway ? body : body.giveaway as Record<string, unknown> | undefined;
        if (!giveaway) { const { giveaway: _settings, ...fields } = body; Object.assign(state.product, fields); state.categories = body.categoryIds as number[]; state.imageIds = body.imageIds as number[]; }
        if (settings) Object.assign(state.product, { availability: "GIVEAWAY", count: null, prepaymentAmount: null,
          giveawayEnabled: settings.enabled, giveawayTelegramUrl: settings.telegramUrl, giveawayStartAt: settings.startAt,
          giveawayEndAt: settings.endAt, giveawayWinnersCount: settings.winnersCount, giveawayRules: settings.rules, giveawayHomeText: settings.homeText,
          status: Date.parse(settings.startAt as string) > adminGiveawayNow ? "AWAITING_GIVEAWAY" : "ACTIVE",
        });
      }
      if (state.failAfterWrite) state.readStatus = 500;
      if (state.abort) return route.abort("connectionfailed");
      return fulfillJson(route, state.writeStatus === 200 ? null : { code: state.writeCode, message: "Сервер отклонил товар" }, state.writeStatus);
    }
    state.reads.push(path + url.search);
    const snapshot = structuredClone(response());
    const status = relations ? state.product.availability === "GIVEAWAY" ? 404 : state.relationsStatus : state.readStatus;
    await state.readGate(path);
    if (detail) return fulfillJson(route, status === 200 ? snapshot.product : { message: "Товар недоступен" }, status);
    if (relations) return fulfillJson(route, status === 200 ? { ...snapshot.product, categories: snapshot.categories, imageIds: snapshot.imageIds } : { message: "Связи недоступны" }, status);
    if (giveaway) return fulfillJson(route, state.product.availability === "GIVEAWAY" ? snapshot : { message: "Розыгрыш отсутствует" }, state.product.availability === "GIVEAWAY" ? status : 404);
    if (history) return fulfillJson(route, state.product.availability === "GIVEAWAY" ? [snapshot.product] : []);
    if (list) return fulfillJson(route, path.includes("/agents/2/") ? [snapshot.product] : [adminProductFixture(102, 3)]);
    const p = snapshot.product;
    return fulfillJson(route, p.availability === "GIVEAWAY" && p.giveawayEnabled ? {
      productId: p.id, name: p.name, description: p.description, imageIds: snapshot.imageIds,
      telegramUrl: p.giveawayTelegramUrl, startAt: p.giveawayStartAt, endAt: p.giveawayEndAt,
      winnersCount: p.giveawayWinnersCount, rules: p.giveawayRules, homeText: p.giveawayHomeText, status: p.status,
    } : { message: "Розыгрыш скрыт" }, p.availability === "GIVEAWAY" && p.giveawayEnabled ? 200 : 404);
  });
  return state;
}
function expectAuth(header: string | undefined) { if (header !== "Bearer admin-test-session") throw new Error("Expected current ADMIN authorization"); }
export async function fillConversion(page: Page) {
  await page.getByRole("button", { name: "Преобразовать в розыгрыш", exact: true }).click();
  await page.getByRole("textbox", { name: "Telegram-ссылка", exact: true }).fill("https://t.me/bot_prize");
  await page.getByRole("textbox", { name: "Начало (ISO 8601)", exact: true }).fill("2027-06-02T15:00:00+03:00");
  await page.getByRole("textbox", { name: "Окончание (ISO 8601)", exact: true }).fill("2027-06-03T15:00:00+03:00");
  await page.getByRole("spinbutton", { name: "Число победителей", exact: true }).fill("2");
  await page.getByRole("textbox", { name: "Правила участия", exact: true }).fill("Правила бота");
  await page.getByRole("textbox", { name: "Текст на главной", exact: true }).fill("Новый приз бота");
}
