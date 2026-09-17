import { expect, type Page, type Route } from "@playwright/test";

export const longProductName = "Коллекционная фигурка с очень длинным названием и дополнительным описанием комплектации для проверки мобильной карточки";
export const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
export const image = { id: 77, originalUrl: `data:image/png;base64,${png}`, mediumUrl: `data:image/png;base64,${png}`, thumbnailUrl: `data:image/png;base64,${png}`, contentType: "image/png", width: 1, height: 1 };
export const categories = [{ id: 1, name: "Фигурки", childs: [{ id: 2, name: "Аниме", childs: [] }, { id: 3, name: "Игры", childs: [] }] }];

export const orderFixture = (orderId: number, actualStatus: string, day: number) => ({
  orderId, actualStatus, totalPrice: 2500, createdAt: `2026-07-${String(day).padStart(2, "0")}T10:00:00.000Z`,
  userInfo: { id: 10, imageId: 0, login: "seller", phoneNumber: "+79990000000", mail: "seller@example.com" },
  product: { id: orderId + 100, name: longProductName, count: 2, price: 1250, prepaymentAmount: 0, currency: "RUB", categories,
    imageId: 0, sellerId: 10, expirationDate: "2030-01-01T00:00:00Z", status: "ACTIVE", availability: "PURCHASABLE", sellerLogin: "seller", sellerRating: 5, totalReviews: 2, createdAt: "2026-07-01T00:00:00Z", externalUrl: null },
  transfer: { transferId: 51, addressId: 61, imageId: 0, address: "Тестовый адрес", price: 400, currency: "RUB" },
  images: [], deliveryUrl: "", histories: [{ status: "BOOKED", comment: null, changedAt: "2026-07-01T10:00:00Z" }],
});

export const fulfillJson = async (route: Route, body: unknown, status = 200) => route.fulfill({
  status: route.request().method() === "OPTIONS" ? 204 : status,
  headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS" },
  contentType: "application/json", body: route.request().method() === "OPTIONS" ? undefined : JSON.stringify(body),
});

export const setupMobileAccount = async (page: Page, baseURL?: string) => {
  if (!baseURL) throw new Error("baseURL required");
  const state = {
    customerOrders: [] as ReturnType<typeof orderFixture>[], sellerOrders: [] as ReturnType<typeof orderFixture>[],
    ordersStatus: 200, ordersReads: 0, ordersGate: Promise.resolve(),
    imagesStatus: 200, categoriesStatus: 200, createStatus: 200, writes: [] as Record<string, unknown>[],
  };
  await page.context().addCookies([{ name: "access_token", value: "mobile-account-test", url: baseURL }]);
  await page.route("**/api/config", (route) => fulfillJson(route, { apiUrl: "http://127.0.0.1:9" }));
  await page.route("https://mc.yandex.ru/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.route("http://127.0.0.1:9/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === "OPTIONS") return fulfillJson(route, null);
    if (path === "/auth/profile") return fulfillJson(route, { id: 1, login: "mobile-user", fullName: "Тестовый пользователь", role: "USER", email: "user@example.com", imageId: null, image: [], exp: 0, type: "access" });
    if (path === "/participant") return fulfillJson(route, { id: 1, login: "mobile-user", mail: "user@example.com", fullName: "Тестовый пользователь", phoneNumber: "", status: "ACTIVE", sellerStatus: "DEFAULT", imageId: null, image: [], addresses: [], accounts: [{ id: 1 }], transfers: [{ id: 1, status: "ACTIVE" }], socialNetworks: [{ id: 1 }] });
    if (path === "/categories") return fulfillJson(route, state.categoriesStatus === 200 ? categories : { message: "Categories unavailable" }, state.categoriesStatus);
    if (path === "/order/customer" || path === "/order/seller") {
      state.ordersReads++;
      await state.ordersGate;
      return fulfillJson(route, state.ordersStatus === 200 ? (path.endsWith("customer") ? state.customerOrders : state.sellerOrders) : { message: "Orders unavailable" }, state.ordersStatus);
    }
    if (path === "/images/metadata") return fulfillJson(route, state.imagesStatus === 200 ? [image] : { message: "Images unavailable" }, state.imagesStatus);
    if (path === "/images") return fulfillJson(route, method === "POST" ? [77] : state.imagesStatus === 200 ? [{ fileName: "test.png", contentType: "image/png", imageData: png }] : { message: "Images unavailable" }, state.imagesStatus);
    if (path === "/products" && method === "POST") {
      state.writes.push(route.request().postDataJSON());
      return fulfillJson(route, state.createStatus === 200 ? null : { message: "Create failed" }, state.createStatus);
    }
    return fulfillJson(route, []);
  });
  return state;
};

export const expectNoOverflow = async (page: Page) => expect.poll(async () => page.evaluate(() => {
  const width = document.documentElement.clientWidth;
  return document.documentElement.scrollWidth <= width ? [] : [{ width, scrollWidth: document.documentElement.scrollWidth, elements: Array.from(document.querySelectorAll("main *"))
    .filter((element) => element.getBoundingClientRect().right > width + 1 && element.getBoundingClientRect().width > 0)
    .slice(0, 6).map((element) => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })) }];
})).toEqual([]);
