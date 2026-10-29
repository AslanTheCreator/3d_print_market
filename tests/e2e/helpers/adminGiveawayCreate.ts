import { expect, type Page } from "@playwright/test";
import type { AdminGiveawayProductRequest, GiveawayResponse, ProductDto } from "@/entities/product";
import { adminGiveawayFixture, adminGiveawayNow, setupAdminGiveaway } from "./adminGiveaway";
import { giveawayProduct } from "./giveaway";
import { fulfillJson, png } from "./mobileAccount";

export async function setupGiveawayCreation(page: Page, baseURL?: string, role = "ADMIN") {
  const api = await setupAdminGiveaway(page, baseURL, role);
  const state = { api, creates: [] as AdminGiveawayProductRequest[], status: 200, code: "INVALID_REQUEST", abort: false, applyOnAbort: false,
    failHistory: false, gate: Promise.resolve(), uploadGate: Promise.resolve(), uploadStatus: 200, uploads: [] as string[], ownStatus: 200,
    own: [] as ProductDto[], public: null as GiveawayResponse | null, ownReads: 0, publicReads: 0,
  };
  await page.route("http://127.0.0.1:9/products", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    expect(route.request().method()).toBe("POST"); expect(route.request().headers().authorization).toBeTruthy();
    const input = route.request().postDataJSON() as AdminGiveawayProductRequest; state.creates.push(input);
    await state.gate;
    if (state.status === 200 && (!state.abort || state.applyOnAbort)) {
      const giveaway = input.giveaway!; const id = 9001 + state.own.length;
      const status = Date.parse(giveaway.startAt!) > adminGiveawayNow ? "AWAITING_GIVEAWAY" : "ACTIVE";
      api.products.unshift(adminGiveawayFixture(id, { participantId: 1, name: input.name, description: input.description,
        giveawayEnabled: giveaway.enabled, giveawayTelegramUrl: giveaway.telegramUrl, giveawayStartAt: giveaway.startAt, giveawayEndAt: giveaway.endAt,
        giveawayWinnersCount: giveaway.winnersCount, giveawayRules: giveaway.rules, giveawayHomeText: giveaway.homeText, status }));
      state.own.unshift({ ...giveawayProduct, availability: "GIVEAWAY", id, sellerId: 1, name: input.name!, currency: input.currency as "RUB", status });
      const { enabled, ...publicSettings } = giveaway;
      if (enabled) state.public = { ...publicSettings, productId: id, name: input.name, description: input.description, imageIds: input.imageIds, status };
    }
    if (state.failHistory) api.historyStatus = 500;
    if (state.abort) return route.abort("connectionfailed");
    return fulfillJson(route, state.status === 200 ? null : { code: state.code, message: "Создание отклонено сервером" }, state.status);
  });
  await page.route(url => url.origin === "http://127.0.0.1:9" && url.pathname === "/images", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (route.request().method() !== "POST") return route.fallback();
    const url = new URL(route.request().url()); state.uploads.push(url.search);
    await state.uploadGate;
    return fulfillJson(route, state.uploadStatus === 200 ? [77] : { code: "UPLOAD_FAILED", message: "Изображение не загружено" }, state.uploadStatus);
  });
  await page.route("http://127.0.0.1:9/products/my", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    state.ownReads++; return fulfillJson(route, state.ownStatus === 200 ? state.own : { code: "READ_FAILED", message: "Товары недоступны" }, state.ownStatus);
  });
  await page.route("http://127.0.0.1:9/participant", route => fulfillJson(route, {
    id: 1, login: "administrator", mail: "admin@example.com", fullName: "Администратор", phoneNumber: "", status: "ACTIVE", sellerStatus: "DEFAULT",
    imageId: null, addresses: [], accounts: [], transfers: [], socialNetworks: [],
  }));
  await page.route("http://127.0.0.1:9/giveaways/**", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    expect(route.request().headers().authorization).toBeUndefined(); state.publicReads++;
    return fulfillJson(route, state.public ?? { code: "NOT_FOUND", message: "Недоступен" }, state.public ? 200 : 404);
  });
  return state;
}
export const createGiveawayValues = {
  name: "Новый приз", description: "Описание нового приза", telegramUrl: "https://t.me/new_prize",
  startAt: "2027-06-01T15:00:00+03:00", endAt: "2027-06-02T15:00:00+03:00", winnersCount: 2, rules: "Правила нового розыгрыша", homeText: "Новый текст для главной",
};
export async function fillGiveawayCreation(page: Page) {
  await page.getByRole("textbox", { name: "Название приза", exact: true }).fill(createGiveawayValues.name);
  await page.getByRole("textbox", { name: "Описание приза", exact: true }).fill(createGiveawayValues.description);
  for (const [label, value] of [["Telegram-ссылка", createGiveawayValues.telegramUrl], ["Начало (ISO 8601)", createGiveawayValues.startAt], ["Окончание (ISO 8601)", createGiveawayValues.endAt], ["Правила участия", createGiveawayValues.rules], ["Текст на главной", createGiveawayValues.homeText]])
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
  await page.getByRole("spinbutton", { name: "Число победителей" }).fill(String(createGiveawayValues.winnersCount));
}
export const giveawayImageFile = { name: "prize.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") };
