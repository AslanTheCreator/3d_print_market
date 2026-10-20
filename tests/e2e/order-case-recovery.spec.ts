import { expect, test, type Page } from "@playwright/test";
import type { OrderCaseDetail } from "@/entities/order";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

const details = (page: Page) => page.getByRole("dialog").filter({ has: page.getByText(/Детали заказа №/) });
const open = (page: Page, id: number) => page.getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true }).first().click();
const close = async (page: Page) => { await details(page).getByRole("button", { name: "Закрыть детали заказа", exact: true }).click(); await expect(details(page)).toBeHidden(); };
const mismatch: OrderCaseDetail = { orderCase: { id: 10, orderId: 1, kind: "CANCELLATION_REQUEST", state: "RESOLVED", outcome: "REJECTED" }, orderStatus: "DISPUTED" };

async function holdReconciliation(page: Page, path: "/order/customer" | "/order/seller", snapshot: () => unknown, current = () => true) {
  let armed = false, released = false, completed = false, signalStarted!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { signalStarted = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const pending: Promise<void>[] = [];
  await page.route(`http://127.0.0.1:9${path}`, async route => {
    // Arm включается только чтением истории заказа 1; повторные GET той же роли тоже удерживаются.
    if (route.request().method() !== "GET" || !armed || released || !current()) return route.fallback();
    const data = structuredClone(snapshot());
    let finish!: () => void; pending.push(new Promise<void>(resolve => { finish = resolve; }));
    signalStarted();
    try {
      await gate;
      try { await fulfillJson(route, data); }
      catch (error) { if (!route.request().failure()) throw error; }
    } finally { finish(); }
  });
  return {
    started, arm: () => { armed = true; }, get completed() { return completed; },
    release: async () => { released = true; release(); await Promise.all(pending); completed = true; },
  };
}

// Дополнительные GET имитируют параллельные чтения шапки и не меняют query cache.
const readOrderLists = (page: Page, first: "customer" | "seller") => page.evaluate(async first => {
  const other = first === "customer" ? "seller" : "customer";
  return Promise.all([first, other, other, first].map(role => fetch(`http://127.0.0.1:9/order/${role}`, {
    headers: { Authorization: "Bearer mobile-account-test" },
  }).then(response => response.status)));
}, first);

for (const role of ["purchase", "sales"] as const) for (const late of [false, true]) test(`${role}: reconciliation belongs to order 1, late=${late}; order 2 completes B1 and order 1 remains blocked`, async ({ page, baseURL }) => {
  const account = await setupMobileAccount(page, baseURL);
  const orders = [orderFixture(1, "AWAITING_PAYMENT", 1), orderFixture(2, "AWAITING_PAYMENT", 2)].map(order => ({ ...order, paymentProofImageId: null }));
  if (role === "sales") orders.forEach(order => { order.product.sellerId = 1; });
  account[role === "purchase" ? "customerOrders" : "sellerOrders"] = orders;
  const cases: OrderCaseDetail[] = []; const posts: URL[] = [];
  const endpoint = role === "purchase" ? "customer" : "seller";
  const delayed = late ? await holdReconciliation(page, `/order/${endpoint}`, () => orders) : null;
  await page.route("**/order/*/cases", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    const firstOrder = new URL(route.request().url()).pathname === "/order/1/cases";
    if (firstOrder) delayed?.arm();
    return fulfillJson(route, firstOrder ? [mismatch] : cases);
  });
  await page.route("**/order/2/cancellation-request?*", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    expect(route.request().method()).toBe("POST"); expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(route.request().postData()).toBeNull(); const url = new URL(route.request().url()); posts.push(url);
    cases.push({ orderCase: { id: 20, orderId: 2, kind: "CANCELLATION_REQUEST", state: "OPEN", openingComment: url.searchParams.get("comment"), openedBy: 1 }, buyerId: role === "sales" ? 10 : 1, sellerId: role === "sales" ? 1 : 10, orderStatus: "AWAITING_PAYMENT" });
    return fulfillJson(route, null);
  });
  await page.goto(`/dashboard/${role}`);
  await expect(page.getByRole("button", { name: "Подробнее о заказе №2", exact: true }).first()).toBeVisible();
  if (late) expect(await readOrderLists(page, endpoint)).toEqual([200, 200, 200, 200]);
  let backgroundReads: ReturnType<typeof readOrderLists> | undefined;
  try {
    await open(page, 1);
    if (delayed) {
      await delayed.started;
      await expect(page.getByTestId("order-cases").getByRole("button", { name: "Обновить заказ", exact: true })).toBeDisabled();
      backgroundReads = readOrderLists(page, endpoint === "customer" ? "seller" : "customer");
    }
    else await expect(page.getByTestId("order-cases")).toContainText("Статусы заказа и обращений расходятся");
    await close(page);
    const warning = page.getByRole("alert").filter({ hasText: "Заказ №1." });
    await expect(warning).toContainText("Действия недоступны до сверки статуса заказа с обращениями.");
    await expect(warning.getByRole("button", { name: "Обновить заказ", exact: true })).toBeVisible();
    await open(page, 2);
  } finally {
    await delayed?.release();
    if (backgroundReads) expect(await backgroundReads).toEqual([200, 200, 200, 200]);
  }
  if (delayed) expect(delayed.completed).toBe(true);
  const form = page.getByTestId("order-case-create");
  await expect(form.getByRole("button", { name: "Запросить отмену", exact: true })).toBeEnabled();
  await expect(page.getByTestId("order-cases")).not.toContainText("Статусы заказа и обращений расходятся");
  await form.getByRole("button", { name: "Запросить отмену", exact: true }).click();
  await form.getByLabel("Комментарий обращения").fill("Отмена только заказа 2");
  await form.getByRole("button", { name: "Отправить обращение", exact: true }).click();
  await expect(form).toContainText("Обращение создано. Заказ и история обновлены.");
  expect(posts).toHaveLength(1); expect(posts[0].pathname).toBe("/order/2/cancellation-request"); expect(posts[0].searchParams.get("comment")).toBe("Отмена только заказа 2");
  await close(page); await open(page, 1);
  await expect(page.getByTestId("order-cases")).toContainText("Статусы заказа и обращений расходятся");
  await expect(form.getByRole("button", { name: "Запросить отмену", exact: true })).toHaveCount(0);
  await page.getByTestId("order-cases").getByRole("button", { name: "Обновить заказ", exact: true }).click();
  await expect(page.getByTestId("order-cases")).toContainText("Статусы заказа и обращений расходятся"); expect(posts).toHaveLength(1);
});

test("late reconciliation from account A cannot block the same orderId after login B", async ({ page, baseURL }) => {
  const account = await setupMobileAccount(page, baseURL); account.customerOrders = [{ ...orderFixture(1, "AWAITING_PAYMENT", 1), paymentProofImageId: null } as ReturnType<typeof orderFixture>];
  let owner = 1;
  const delayed = await holdReconciliation(page, "/order/customer", () => account.customerOrders, () => owner === 1);
  await page.route("**/order/1/cases", route => {
    if (route.request().method() === "GET" && owner === 1) delayed.arm();
    return fulfillJson(route, owner === 1 ? [mismatch] : []);
  });
  await page.route("**/auth/login", route => { if (route.request().method() !== "OPTIONS") owner = 2; return fulfillJson(route, { access_token: "account-B", refresh_token: "refresh-B" }); });
  await page.goto("/dashboard/purchase"); expect(await readOrderLists(page, "seller")).toEqual([200, 200, 200, 200]);
  try {
    await open(page, 1); await delayed.started;
    await expect(page.getByTestId("order-cases").getByRole("button", { name: "Обновить заказ", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Выход", exact: true, includeHidden: true }).evaluate(button => (button as HTMLButtonElement).click());
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.getByLabel(/^Email/).fill("b@example.test"); await page.getByLabel(/^Пароль/).fill("password"); await page.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/); await page.locator('a[href="/dashboard/purchase"]').first().click(); await open(page, 1);
    await expect(page.getByTestId("order-case-create").getByRole("button", { name: "Запросить отмену", exact: true })).toBeEnabled();
  } finally { await delayed.release(); }
  await expect.poll(() => delayed.completed).toBe(true);
  await expect(page.getByTestId("order-cases")).not.toContainText("Статусы заказа и обращений расходятся");
  await expect(page.getByTestId("order-case-create").getByRole("button", { name: "Запросить отмену", exact: true })).toBeEnabled();
});
