import { expect, type Page } from "@playwright/test";
import type { GiveawayResponse } from "@/entities/product";
import { mockGuestAuth } from "./guestAuth";
import { fulfillJson, image, orderFixture, setupMobileAccount } from "./mobileAccount";

export const giveawayNow = Date.parse("2027-06-01T12:00:00Z");
export const giveawayFixture = (patch: Partial<GiveawayResponse> = {}): GiveawayResponse => ({
  productId: 8101, name: "Серверный приз", description: "Описание настоящего приза",
  homeText: "Серверный текст на главной", rules: "Условия участия из API",
  imageIds: [77], telegramUrl: "https://t.me/figurzilla_giveaway",
  startAt: new Date(giveawayNow - 60_000).toISOString(),
  endAt: new Date(giveawayNow + 180_000).toISOString(), winnersCount: 2, status: "ACTIVE", ...patch,
});
export const giveawayProduct = { ...orderFixture(8101, "BOOKED", 1).product,
  id: 8101, name: "Приз из списка", availability: "GIVEAWAY", price: 0, prepaymentAmount: 0, count: null, imageId: 0,
};

export async function setupGiveaway(page: Page, options: { baseURL?: string; authenticated?: boolean; controlledClock?: boolean } = {}) {
  if (options.controlledClock) {
    await page.clock.install({ time: new Date(giveawayNow) });
  } else await page.clock.setFixedTime(giveawayNow);
  if (options.authenticated) await setupMobileAccount(page, options.baseURL);
  else await mockGuestAuth(page);
  const state = {
    now: giveawayNow,
    active: giveawayFixture() as GiveawayResponse | null,
    details: new Map<number, GiveawayResponse>([[8101, giveawayFixture()]]),
    activeStatus: 200, detailStatus: 200, metadataStatus: 200, catalogStatus: 200,
    networkFailure: false, computeWindow: true,
    products: [] as unknown[], reads: [] as string[], metadataReads: [] as string[], productReads: [] as string[], writes: [] as string[],
  };
  await page.route("http://127.0.0.1:9/giveaways/**", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    const path = new URL(route.request().url()).pathname;
    state.reads.push(path);
    expect(route.request().method()).toBe("GET");
    expect(route.request().headers().authorization).toBeUndefined();
    if (state.networkFailure) return route.abort("connectionfailed");
    const active = path === "/giveaways/active";
    const data = active ? state.active : state.details.get(Number(path.split("/").at(-1)));
    const status = active ? state.activeStatus : state.detailStatus;
    if (status !== 200) return fulfillJson(route, { message: "Giveaway unavailable" }, status);
    if (!data || (state.computeWindow && data.endAt && Date.parse(data.endAt) <= state.now)) return fulfillJson(route, { message: "Not found" }, 404);
    return fulfillJson(route, state.computeWindow && data.startAt
      ? { ...data, status: state.now < Date.parse(data.startAt) ? "AWAITING_GIVEAWAY" : "ACTIVE" } : data);
  });
  await page.route("**/products/find", route => fulfillJson(route, state.catalogStatus === 200 ? state.products : { message: "Catalog unavailable" }, state.catalogStatus));
  await page.route("**/images/metadata?*", route => {
    if (route.request().method() !== "OPTIONS") {
      state.metadataReads.push(new URL(route.request().url()).search);
      expect(route.request().headers().authorization).toBeUndefined();
    }
    return fulfillJson(route, state.metadataStatus === 200 ? [image] : { message: "Metadata unavailable" }, state.metadataStatus);
  });
  page.on("request", request => {
    if (request.method() === "OPTIONS") return;
    const path = new URL(request.url()).pathname;
    if (/^\/product\//.test(path)) state.productReads.push(path);
    if (!["GET", "HEAD"].includes(request.method()) && !["/products/find", "/products/names/find", "/products/my", "/basket/find", "/favorites/find"].includes(path)) state.writes.push(path);
  });
  return state;
}
