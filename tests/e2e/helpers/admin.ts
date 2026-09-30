import type { Page } from "@playwright/test";
import { categories, fulfillJson, image, orderFixture, png } from "./mobileAccount";

export const adminProductFixture = (id = 101, participantId = 2) => ({
  id, participantId, name: `Фигурка дракона ${id}`, description: "Описание товара", price: 4000,
  prepaymentAmount: 1000, count: 0 as number | null, currency: "RUB", originality: "Оригинал",
  availability: "EXTERNAL_PRODUCT", externalUrl: "https://t.me/example/123", status: "ACTIVE", createdAt: "2026-09-29T10:00:00Z", expirationDate: "2026-10-29T10:00:00Z",
});
export const adminOrderFixture = (id = 201, status = "BOOKED", prepayment = 2000) => ({
  ...orderFixture(id, status, 1), sellerId: 2, sellerLogin: "bot-two", prepaymentAmount: prepayment, totalPrice: 6000,
  images: [] as number[],
  product: { ...orderFixture(id, status, 1).product, name: "Фигурка для заказа", sellerId: 2, sellerLogin: "bot-two", availability: "EXTERNAL_PRODUCT", price: 4000, count: 2 },
});
export async function setupAdmin(page: Page, baseURL: string | undefined, role = "ADMIN") {
  if (!baseURL) throw new Error("baseURL required");
  const state = {
    role, profileStatus: 200, agentsStatus: 200, productStatus: 200, relationsStatus: 200, saveStatus: 200, restoreStatus: 200,
    actionStatus: 200, actionAbort: false, applyBeforeAbort: false, proofStatus: 200, accountsStatus: 404, failAccountsReadAfterWrite: false, recordAbort: false,
    products: [adminProductFixture()], orders: [adminOrderFixture()],
    agents: [{ id: 2, login: "bot-two", status: "ACTIVE" }, { id: 3, login: "bot-three", status: "ACTIVE" }],
    accounts: [] as Record<string, unknown>[],
    records: { transfers: [], "social-networks": [], addresses: [] } as Record<string, Record<string, unknown>[]>,
    profile: { id: 2, login: "bot-two", status: "ACTIVE", fullName: "Продавец бота", phoneNumber: "", imageId: null, deadlineSending: 1, deadlinePayment: 2 },
    writes: [] as { path: string; method: string; body: Record<string, unknown> | null; search: string }[],
    reads: [] as string[], activeLists: 0, maxLists: 0, listDelay: 0, failedAgent: 0, categories: [1], imageIds: [77], orderReadStatus: 200, failOrderReadAfterAction: false,
  };
  await page.context().addCookies([{ name: "access_token", value: "admin-test-session", url: baseURL }]);
  await page.route("**/api/config", (route) => fulfillJson(route, { apiUrl: "http://127.0.0.1:9" }));
  await page.route("https://mc.yandex.ru/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.route("http://127.0.0.1:9/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (method === "OPTIONS") return fulfillJson(route, null);
    if (method === "GET") state.reads.push(path + url.search);
    if (path === "/auth/profile") return fulfillJson(route, { id: 1, role: state.role, login: "administrator", imageId: null, exp: 0, type: "access" }, state.profileStatus);
    if (path === "/categories") return fulfillJson(route, categories);
    if (path === "/images/metadata") return fulfillJson(route, [image]);
    if (path === "/images") {
      if (method === "POST") return fulfillJson(route, [88]);
      return fulfillJson(route, state.proofStatus === 200 ? [{ fileName: "payment.png", contentType: "image/png", imageData: png }] : { code: "FORBIDDEN", message: "Нет доступа к файлу" }, state.proofStatus);
    }
    if (path.startsWith("/product/")) {
      const product = state.products.find((item) => item.id === Number(path.split("/").pop()));
      return fulfillJson(route, state.relationsStatus === 200 ? { ...product, categories: state.categories.map((id) => ({ id, name: `Категория ${id}`, childs: [] })), imageIds: state.imageIds } : { message: "Связи недоступны" }, state.relationsStatus);
    }
    if (path === "/admin/actions/agents") return fulfillJson(route, state.agents, state.agentsStatus);
    if (method !== "GET" && path.startsWith("/admin/")) {
      const body = route.request().postData() ? route.request().postDataJSON() as Record<string, unknown> : null;
      state.writes.push({ path, method, body, search: url.search });
      if (/\/orders\/\d+\//.test(path)) {
        const id = Number(path.split("/").at(-2)); const action = path.split("/").pop();
        const order = state.orders.find((item) => item.orderId === id);
        if (order && (state.actionStatus === 200 || state.applyBeforeAbort)) order.actualStatus = action === "CONFIRM" ? (order.prepaymentAmount ? "AWAITING_PREPAYMENT" : "AWAITING_PAYMENT") : action === "CONFIRM_PREPAYMENT" ? "AWAITING_PAYMENT" : action === "SHIP" ? "ON_THE_WAY" : "FAILED";
        if (state.actionAbort) return route.abort("connectionfailed");
        if (state.failOrderReadAfterAction) state.orderReadStatus = 500;
        return fulfillJson(route, state.actionStatus === 200 ? id : { code: "ACTION_REJECTED", message: "Действие отклонено" }, state.actionStatus);
      }
      if (/\/products\/\d+$/.test(path)) {
        if (state.saveStatus === 200) {
          const product = state.products.find((item) => item.id === Number(path.split("/").pop()));
          if (product) Object.assign(product, body);
        }
        return fulfillJson(route, state.saveStatus === 200 ? null : { message: "Сохранение отклонено" }, state.saveStatus);
      }
      if (/\/product\/\d+$/.test(path)) {
        if (state.restoreStatus === 200) { const product = state.products.find((item) => item.id === Number(path.split("/").pop())); if (product) product.status = url.searchParams.get("productStatus")!; }
        return fulfillJson(route, state.restoreStatus === 200 ? null : { message: "Статус не изменён" }, state.restoreStatus);
      }
      if (path.endsWith("/extend")) { state.products[0].status = "ACTIVE"; return fulfillJson(route, null); }
      if (path.endsWith("/profile")) { Object.assign(state.profile, body); return fulfillJson(route, state.profile); }
      const match = path.match(/\/agents\/\d+\/(accounts|transfers|social-networks|addresses)(?:\/(\d+))?$/);
      if (match) {
        const records = match[1] === "accounts" ? state.accounts : state.records[match[1]];
        if (method === "POST") records.push({ ...body, id: 100 + records.length, participantId: 2 });
        if (method === "PUT") Object.assign(records.find((item) => item.id === Number(match[2]))!, body);
        if (method === "DELETE") records.splice(records.findIndex((item) => item.id === Number(match[2])), 1);
        if (match[1] === "accounts") state.accountsStatus = state.failAccountsReadAfterWrite ? 500 : 200;
        if (state.recordAbort) return route.abort("connectionfailed");
        return fulfillJson(route, null);
      }
    }
    if (/\/agents\/\d+\/profile$/.test(path)) return fulfillJson(route, state.profile);
    if (/\/agents\/\d+\/products$/.test(path)) {
      const agent = Number(path.split("/").at(-2));
      state.activeLists++; state.maxLists = Math.max(state.maxLists, state.activeLists);
      if (state.listDelay) await new Promise((resolve) => setTimeout(resolve, state.listDelay));
      state.activeLists--;
      return fulfillJson(route, agent === state.failedAgent ? { message: "Список недоступен" } : state.products.filter((item) => item.participantId === agent), agent === state.failedAgent ? 500 : state.productStatus);
    }
    if (/\/admin\/actions\/products\/\d+$/.test(path)) return fulfillJson(route, state.products.find((item) => item.id === Number(path.split("/").pop())));
    if (path === "/admin/actions/agent-orders" || /\/agents\/\d+\/orders$/.test(path)) {
      if (state.orderReadStatus !== 200) return fulfillJson(route, { code: "READ_FAILED", message: "Список заказов недоступен" }, state.orderReadStatus);
      const status = url.searchParams.get("status"); const pageIndex = Number(url.searchParams.get("page"));
      return fulfillJson(route, state.orders.filter((item) => !status || item.actualStatus === status).slice(pageIndex * 50, (pageIndex + 1) * 50));
    }
    if (path.endsWith("/accounts")) return fulfillJson(route, state.accountsStatus === 200 ? state.accounts : { code: state.accountsStatus === 404 ? "ACCOUNT_NOT_FOUND" : "ERROR", message: "Реквизиты недоступны" }, state.accountsStatus);
    const resource = path.split("/").pop()!;
    if (resource in state.records) return fulfillJson(route, state.records[resource]);
    return fulfillJson(route, []);
  });
  return state;
}
