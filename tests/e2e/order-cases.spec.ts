import { expect, test, type Page } from "@playwright/test";
import type { OrderCaseDetail, OrderStatus } from "@/entities/order";
import { fulfillJson, orderFixture, setupMobileAccount, expectNoOverflow } from "./helpers/mobileAccount";
import { orderCaseDetailFixture } from "./helpers/backendContracts";

const detail = (orderId = 1, orderStatus: OrderStatus = "AWAITING_PAYMENT", comment = "Прошу отменить заказ"): OrderCaseDetail => orderCaseDetailFixture({
  orderStatus, buyerId: 1, sellerId: 10, currency: "RUB", orderImages: [], caseImages: [],
}, { id: orderId * 10, orderId, kind: "CANCELLATION_REQUEST", state: "OPEN", openedBy: 10, openingComment: comment, createdAt: "2026-10-01T10:00:00Z" });
const open = async (page: Page, id = 1) => page.getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true }).first().click();
const dialog = (page: Page) => page.getByRole("dialog").filter({ has: page.getByText(/Детали заказа №/) });
const close = async (page: Page) => { await dialog(page).getByRole("button", { name: "Закрыть детали заказа", exact: true }).click(); await expect(dialog(page)).toBeHidden(); };

for (const role of ["purchase", "sales"] as const) test(`${role}: cases load only in details, OPEN ignores status, resolved/LEGACY/unknown kind and Telegram are safe`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width: role === "purchase" ? 393 : 1280, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  state[role === "purchase" ? "customerOrders" : "sellerOrders"] = Array.from({ length: 10 }, (_, index) => orderFixture(index + 1, "AWAITING_PAYMENT", index + 1));
  let reads = 0;
  await page.route("**/order/*/cases", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    reads++; expect(route.request().headers().authorization).toMatch(/^Bearer /);
    return fulfillJson(route, [detail(),
      { ...detail(), orderCase: { ...detail().orderCase, id: 11, state: "RESOLVED", outcome: "REJECTED", resolutionComment: "Отмена отклонена", resolvedAt: "2026-10-02T10:00:00Z", telegramUrl: "https://t.me/order_discussion" } },
      { ...detail(), orderCase: { id: 12, state: "RESOLVED", kind: "NEW_KIND", openedBy: 777, outcome: "LEGACY", telegramUrl: "https://t.me.evil.invalid/fake" } },
    ]);
  });
  await page.goto(`/dashboard/${role}`);
  await expect(page.getByRole("button", { name: "Подробнее о заказе №10", exact: true }).first()).toBeVisible(); expect(reads).toBe(0);
  await open(page);
  const cases = page.getByTestId("order-cases");
  await expect(cases.getByTestId("order-case-card")).toHaveCount(3);
  await expect(cases.getByText("Обращение открыто", { exact: true })).toBeVisible();
  await expect(cases.getByText("Автор: seller", { exact: true })).toHaveCount(2);
  await expect(cases.getByText("Автор: Участник #777", { exact: true })).toBeVisible();
  await expect(cases.getByText("Решение: Решение по историческому спору", { exact: true })).toBeVisible();
  await expect(cases.getByText(/Обращение неизвестного типа/)).toBeVisible();
  await expect(cases.getByText("Комментарий решения: Отмена отклонена", { exact: true })).toBeVisible();
  await expect(cases.getByRole("link", { name: "Обсуждение в Telegram" })).toHaveAttribute("href", "https://t.me/order_discussion");
  await expect(cases.getByRole("link")).toHaveCount(1); expect(reads).toBe(1);
  await close(page); await open(page); await expect(cases.getByTestId("order-case-card")).toHaveCount(3); expect(reads).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); window.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); window.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => reads).toBe(3);
  await expectNoOverflow(page);
});

for (const status of [403, 500]) test(`cases ${status} stays an error, preserves details/images, and recovers through retry and reopen`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [{ ...orderFixture(1, "AWAITING_PAYMENT", 1), images: [55] }];
  let responseStatus = status;
  let cases: OrderCaseDetail[] = [];
  await page.route("**/order/1/cases", route => fulfillJson(route, responseStatus === 200 ? cases : { message: "История недоступна" }, responseStatus));
  await page.goto("/dashboard/purchase"); await open(page);
  const section = page.getByTestId("order-cases");
  await expect(section.getByText(status === 403 ? "Доступ запрещён" : "Ошибка сервера", { exact: true })).toBeVisible();
  await expect(section.getByText("Обращений пока нет.", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("order-images").getByRole("img").first()).toBeVisible();
  await expect(dialog(page).getByText("Контакты", { exact: true })).toBeVisible();
  await expect(dialog(page).getByText(/Подтверждение оплаты не приложено/)).toHaveCount(0);
  responseStatus = 200; await section.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(section.getByText("Обращений пока нет.", { exact: true })).toBeVisible();
  await close(page); cases = [detail()]; await open(page);
  await expect(section.getByText("Обращение открыто", { exact: true })).toBeVisible();
});

test("closing a pending history, selecting another order and reopening cannot display its late response", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL); state.customerOrders = [orderFixture(1, "AWAITING_PAYMENT", 1), orderFixture(2, "AWAITING_PAYMENT", 2)];
  let release!: () => void, started = false, finished = false, first = true;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/order/*/cases", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    const id = Number(new URL(route.request().url()).pathname.split("/")[2]);
    if (id === 1 && first) { first = false; started = true; await gate; await fulfillJson(route, [detail(1, "AWAITING_PAYMENT", "Поздний секрет заказа 1")]).catch(() => {}); finished = true; }
    else await fulfillJson(route, [detail(id, "AWAITING_PAYMENT", id === 2 ? "Обращение заказа 2" : "Свежая история заказа 1")]);
  });
  await page.goto("/dashboard/purchase"); await open(page);
  await expect.poll(() => started).toBe(true); await expect(page.getByTestId("order-cases").getByRole("progressbar")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(dialog(page)).toBeHidden(); await open(page, 2);
  await expect(dialog(page).getByText("Причина: Обращение заказа 2", { exact: true })).toBeVisible();
  release(); await expect.poll(() => finished).toBe(true);
  await expect(dialog(page).getByText(/Поздний секрет/)).toHaveCount(0);
  await close(page); await open(page);
  await expect(dialog(page).getByText("Причина: Свежая история заказа 1", { exact: true })).toBeVisible();
});

for (const inside of [true, false]) test(`known payment proof is selected by ID, inside orderImages=${inside}, and remains associated with a case`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [{ ...orderFixture(1, "AWAITING_PAYMENT", 1), images: inside ? [55, 66, 66, 77] : [55, 77], paymentProofImageId: 66 } as ReturnType<typeof orderFixture>];
  const item = { ...detail(), paymentProofImageId: 66, orderImages: inside ? [88, 55, 66, 77] : [88, 55, 77], caseImages: [99, 99, 66] };
  await page.route("**/order/1/cases", route => fulfillJson(route, [item]));
  const reads: string[] = [];
  const imageData = (id: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><text>${id}</text></svg>`).toString("base64");
  await page.route("**/images?ids=*", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    const ids = new URL(route.request().url()).searchParams.getAll("ids").join(","); reads.push(ids);
    return fulfillJson(route, ids.split(",").reverse().map(id => ({ fileName: "arbitrary.png", contentType: "image/svg+xml", imageData: imageData(Number(id)) })));
  });
  await page.goto("/dashboard/purchase"); await open(page);
  await expect(page.getByTestId("order-case-card")).toHaveCount(1);
  await expect(page.getByTestId("order-images")).toHaveCount(1);
  await expect(page.getByTestId("payment-proof").getByRole("img").first()).toHaveAttribute("src", `data:image/svg+xml;base64,${imageData(66)}`);
  await expect(page.getByTestId("case-images").getByRole("img").first()).toBeVisible();
  expect(reads).toContain("55,77,88"); expect(reads).toContain("66"); expect(reads).toContain("99");
  await expect(page.getByTestId("order-case-card").getByRole("link", { name: "Подтверждение оплаты, файл #66", exact: true })).toHaveAttribute("href", "#order-1-payment-proof-66");
});

for (const proof of [undefined, null, 0]) test(`proof=${proof} and empty history never imply missing payment; neutral files remain available`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [{ ...orderFixture(1, "AWAITING_PAYMENT", 1), images: [55], paymentProofImageId: proof } as ReturnType<typeof orderFixture>];
  await page.route("**/order/1/cases", route => fulfillJson(route, []));
  await page.goto("/dashboard/purchase"); await open(page);
  await expect(page.getByTestId("order-cases").getByText("Обращений пока нет.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("order-images").getByRole("img").first()).toBeVisible();
  await expect(page.getByTestId("payment-proof")).toHaveCount(0);
  await expect(dialog(page).getByText(/Подтверждение оплаты не приложено/)).toHaveCount(0);
});

for (const historyStatus of [200, 500]) test(`registered proof before first-case history works independently of cases status ${historyStatus}`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [{ ...orderFixture(1, "AWAITING_PAYMENT", 1), images: [55, 66], paymentProofImageId: 66 } as ReturnType<typeof orderFixture>];
  const groups: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === "/images") groups.push(url.searchParams.getAll("ids").join(","));
  });
  await page.route("**/order/1/cases", route => fulfillJson(route, historyStatus === 200 ? [] : { message: "Unavailable" }, historyStatus));
  await page.goto("/dashboard/purchase"); await open(page);
  await expect(page.getByTestId("order-cases").getByText(historyStatus === 200 ? "Обращений пока нет." : "Ошибка сервера", { exact: true })).toBeVisible();
  await expect(page.getByTestId("payment-proof").getByRole("img").first()).toBeVisible();
  await expect(page.getByTestId("order-images").getByRole("img").first()).toBeVisible();
  expect(groups).toContain("55"); expect(groups).toContain("66"); expect(groups).not.toContain("55,66");
  await expect(dialog(page).getByText(/Подтверждение оплаты не приложено/)).toHaveCount(0);
});

test("appeal evidence remains case images when the order has no registered proof", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL); state.customerOrders = [orderFixture(1, "CANCELLED", 1)];
  const item = detail(1, "CANCELLED"); item.orderCase = { ...item.orderCase, kind: "PAYMENT_APPEAL", state: "RESOLVED", outcome: "BUYER" }; item.paymentProofImageId = null; item.caseImages = [99];
  await page.route("**/order/1/cases", route => fulfillJson(route, [item]));
  await page.goto("/dashboard/purchase"); await open(page);
  await expect(page.getByTestId("case-images").getByRole("img").first()).toBeVisible();
  await expect(page.getByTestId("payment-proof")).toHaveCount(0);
});

for (const failure of [false, true]) test(`fresh case status refreshes the existing list and guards stale actions through close, list failure=${failure}`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL); state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  let listReads = 0;
  page.on("request", request => { if (request.method() === "GET" && new URL(request.url()).pathname === "/order/customer") listReads++; });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/order/1/cases", route => {
    state.customerOrders[0].actualStatus = "DISPUTED"; state.ordersGate = gate;
    if (failure) state.ordersStatus = 500;
    return fulfillJson(route, [detail(1, "DISPUTED")]);
  });
  await page.goto("/dashboard/purchase"); await open(page);
  await expect(page.getByTestId("order-cases").getByText("Обращение открыто", { exact: true })).toBeVisible();
  await expect.poll(() => listReads).toBe(2);
  await close(page);
  await expect(page.getByRole("button", { name: "Отменить", exact: true }).first()).toBeDisabled();
  release();
  if (failure) {
    await expect(page.getByText("Не удалось обновить заказы. Действия недоступны до успешной загрузки.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Отменить", exact: true }).first()).toBeDisabled();
    state.ordersStatus = 200;
    await page.getByRole("button", { name: "Обновить заказ", exact: true }).click();
  }
  await expect(page.getByRole("button", { name: "Отменить", exact: true })).toHaveCount(0);
  await expect(page.getByText("Действия недоступны до сверки статуса заказа с обращениями.", { exact: true })).toHaveCount(0);
});

test("a foreign order in cases is rejected without rendering its comments or image IDs", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL); state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  await page.route("**/order/1/cases", route => fulfillJson(route, [{ ...detail(2, "BOOKED", "Чужое обращение"), caseImages: [888] }]));
  await page.goto("/dashboard/purchase"); await open(page);
  await expect(page.getByTestId("order-cases").getByText("Некорректный ответ истории обращений заказа", { exact: true })).toBeVisible();
  await expect(dialog(page).getByText(/Чужое обращение/)).toHaveCount(0);
  await expect(page.getByTestId("case-images")).toHaveCount(0);
});

test("a successful but inconsistent list read keeps actions locked without an automatic GET loop and recovers on reopen", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL); state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  let caseStatus: OrderStatus = "DISPUTED", listReads = 0, omitStatus = false;
  page.on("request", request => { if (request.method() === "GET" && new URL(request.url()).pathname === "/order/customer") listReads++; });
  await page.route("**/order/1/cases", route => fulfillJson(route, [{ ...detail(1, caseStatus), orderStatus: omitStatus ? undefined : caseStatus }]));
  await page.goto("/dashboard/purchase"); await open(page);
  await expect(page.getByTestId("order-cases").getByText("Статусы заказа и обращений расходятся. Повторите обновление или откройте детали заново.", { exact: true })).toBeVisible();
  expect(listReads).toBe(2);
  await close(page);
  await expect(page.getByRole("button", { name: "Отменить", exact: true }).first()).toBeDisabled();
  expect(listReads).toBe(2);
  // Optional-поле старого ответа не подтверждает исчезновение уже замеченного расхождения.
  omitStatus = true; await open(page);
  await expect(page.getByTestId("order-cases").getByText("Обращение открыто", { exact: true })).toBeVisible();
  await close(page);
  await expect(page.getByRole("button", { name: "Отменить", exact: true }).first()).toBeDisabled();
  expect(listReads).toBe(2);
  omitStatus = false; caseStatus = "BOOKED"; await open(page);
  await expect(page.getByTestId("order-cases").getByText("Обращение открыто", { exact: true })).toBeVisible();
  await close(page);
  await expect(page.getByRole("button", { name: "Отменить", exact: true }).first()).toBeEnabled();
  expect(listReads).toBe(2);
});

test("logout/login while cases are pending cannot disclose the previous account history", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL); state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  let owner = 1, started = false, completed = false, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/order/1/cases", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (owner === 1) { started = true; await gate; await fulfillJson(route, [detail(1, "BOOKED", "Секрет аккаунта A")]).catch(() => {}); completed = true; }
    else await fulfillJson(route, [detail(1, "BOOKED", "История аккаунта B")]);
  });
  await page.route("**/auth/login", route => {
    if (route.request().method() !== "OPTIONS") owner = 2;
    return fulfillJson(route, { access_token: "account-B", refresh_token: "refresh-B" });
  });
  await page.goto("/dashboard/purchase"); await open(page); await expect.poll(() => started).toBe(true);
  await page.getByRole("button", { name: "Выход", exact: true, includeHidden: true }).evaluate(button => (button as HTMLButtonElement).click());
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByLabel(/^Email/).fill("b@example.test"); await page.getByLabel(/^Пароль/).fill("password");
  await page.getByRole("button", { name: "Войти", exact: true }).click(); await expect(page).not.toHaveURL(/\/auth\/login/);
  await page.locator('a[href="/dashboard/purchase"]').first().click(); await open(page);
  await expect(dialog(page).getByText("Причина: История аккаунта B", { exact: true })).toBeVisible();
  release(); await expect.poll(() => completed).toBe(true);
  await expect(dialog(page).getByText(/Секрет аккаунта A/)).toHaveCount(0);
});
