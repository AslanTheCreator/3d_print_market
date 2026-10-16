import { expect, test, type Page } from "@playwright/test";
import type { OrderCaseDetail, OrderCaseKind } from "@/entities/order";
import { fulfillJson, orderFixture, png, setupMobileAccount, expectNoOverflow } from "./helpers/mobileAccount";

const labels: Record<OrderCaseKind, string> = { CANCELLATION_REQUEST: "Запросить отмену", DISPUTE: "Открыть спор", PAYMENT_APPEAL: "Сообщить об оплате после отмены" };
const comment = "Оплата & отмена? + = / №42";
const form = (page: Page) => page.getByTestId("order-case-create");
const submit = (page: Page) => form(page).getByRole("button", { name: "Отправить обращение", exact: true });
const openDetails = async (page: Page) => page.getByRole("button", { name: "Подробнее о заказе №1", exact: true }).first().click();
const files = ["one.png", "two.png"].map(name => ({ name, mimeType: "image/png", buffer: Buffer.from(png, "base64") }));

async function setup(page: Page, baseURL: string | undefined, kind: OrderCaseKind, role: "purchase" | "sales" = "purchase") {
  const account = await setupMobileAccount(page, baseURL);
  const order = { ...orderFixture(1, kind === "PAYMENT_APPEAL" ? "CANCELLED" : "AWAITING_PAYMENT", 1), paymentProofImageId: kind === "DISPUTE" ? 55 : null };
  if (role === "sales") order.product.sellerId = 1;
  account[role === "purchase" ? "customerOrders" : "sellerOrders"] = [order];
  const state = { account, order, cases: [] as OrderCaseDetail[], posts: [] as URL[], uploads: [] as string[], deletes: 0, reads: 0, readStatus: 200,
    failure: null as { code: string; status: number } | null, lost: false, record: true, failAfterPost: false, gate: Promise.resolve() };
  await page.route("**/order/1/cases", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    state.reads++;
    return fulfillJson(route, state.readStatus === 200 ? state.cases.map(item => ({ ...item, orderStatus: order.actualStatus })) : { code: "READ_FAILED", message: "History unavailable" }, state.readStatus);
  });
  const write = async (route: Parameters<typeof fulfillJson>[0]) => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    expect(route.request().method()).toBe("POST"); expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(route.request().postData()).toBeNull();
    const url = new URL(route.request().url()); state.posts.push(url); await state.gate;
    const requestKind: OrderCaseKind = url.pathname.endsWith("cancellation-request") ? "CANCELLATION_REQUEST" : url.pathname.endsWith("payment-appeal") ? "PAYMENT_APPEAL" : "DISPUTE";
    if (state.failure) return fulfillJson(route, { ...state.failure, message: "Generic backend error" }, state.failure.status);
    if (state.record) {
      state.cases.push({ orderCase: { id: 100, orderId: 1, kind: requestKind, state: "OPEN", openedBy: 1, openingComment: url.searchParams.get("comment") }, buyerId: role === "purchase" ? 1 : 10, sellerId: role === "sales" ? 1 : 10, caseImages: url.searchParams.getAll("imageIds").map(Number) });
      if (requestKind !== "CANCELLATION_REQUEST") order.actualStatus = "DISPUTED";
    }
    if (state.failAfterPost) { state.readStatus = 500; account.ordersStatus = 500; }
    return state.lost ? route.abort("connectionfailed") : fulfillJson(route, null);
  };
  for (const path of ["/order/1/cancellation-request", "/order/orders/1/DISPUTED", "/order/1/payment-appeal"]) await page.route(`http://127.0.0.1:9${path}?*`, write);
  await page.route("**/images?tag=ORDER&entityId=1", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    expect(route.request().method()).toBe("POST");
    state.uploads.push(route.request().postDataBuffer()?.toString() ?? "");
    return fulfillJson(route, [100 + state.uploads.length]);
  });
  page.on("request", request => { if (request.method() === "DELETE" && new URL(request.url()).pathname === "/images") state.deletes++; });
  await page.goto(`/dashboard/${role}`); await openDetails(page);
  return state;
}

for (const role of ["purchase", "sales"] as const) for (const kind of ["CANCELLATION_REQUEST", "DISPUTE", "PAYMENT_APPEAL"] as const) {
  if (role === "sales" && kind === "PAYMENT_APPEAL") continue;
  test(`${role} ${kind}: required nonblank comment, exact query, optional images and server status`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width: role === "sales" ? 1280 : 393, height: 900 });
    const state = await setup(page, baseURL, kind, role);
    await form(page).getByRole("button", { name: labels[kind], exact: true }).click();
    await form(page).getByLabel("Комментарий обращения").fill("   "); await submit(page).click();
    await expect(form(page).getByText("Напишите непустой комментарий", { exact: true })).toBeVisible(); expect(state.posts).toHaveLength(0);
    expect(await form(page).getByLabel("Доказательства обращения").count()).toBe(kind === "CANCELLATION_REQUEST" ? 0 : 1);
    await form(page).getByLabel("Комментарий обращения").fill(comment); await submit(page).click();
    await expect(form(page).getByText("Обращение создано. Заказ и история обновлены.", { exact: true })).toBeVisible();
    expect(state.posts).toHaveLength(1); expect(state.posts[0].searchParams.get("comment")).toBe(comment);
    expect([...state.posts[0].searchParams.keys()]).toEqual(["comment"]); expect(state.uploads).toHaveLength(0);
    expect(state.order.actualStatus).toBe(kind === "CANCELLATION_REQUEST" ? "AWAITING_PAYMENT" : "DISPUTED");
    await expect(page.getByTestId("order-case-card").getByText("Обращение открыто", { exact: true })).toBeVisible();
    await expectNoOverflow(page);
  });
}

for (const kind of ["DISPUTE", "PAYMENT_APPEAL"] as const) test(`${kind}: multiple local files upload only on submit; partial success reuses IDs and exact repeated imageIds`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, kind);
  let attempts = 0;
  await page.route("**/images?tag=ORDER&entityId=1", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    const body = route.request().postDataBuffer()?.toString() ?? ""; attempts++; state.uploads.push(body);
    expect(body).toContain('name="files"'); expect(route.request().headers().authorization).toMatch(/^Bearer /);
    if (attempts === 2) return fulfillJson(route, { message: "Upload unavailable" }, 500);
    return fulfillJson(route, [100 + attempts]);
  });
  await form(page).getByRole("button", { name: labels[kind], exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment);
  await form(page).getByLabel("Доказательства обращения").setInputFiles(files);
  expect(state.uploads).toHaveLength(0);
  await submit(page).click(); await expect(form(page).getByText(/Не удалось прочитать заказ или загрузить файлы/)).toBeVisible();
  expect(state.posts).toHaveLength(0); expect(state.uploads).toHaveLength(2);
  await page.getByRole("button", { name: "Закрыть детали заказа", exact: true }).click(); await openDetails(page);
  await expect(form(page).getByLabel("Комментарий обращения")).toHaveValue(comment);
  await expect(form(page).getByText("one.png — загружен", { exact: true })).toBeVisible();
  await submit(page).click(); await expect(form(page).getByText("Обращение создано. Заказ и история обновлены.", { exact: true })).toBeVisible();
  expect(attempts).toBe(3); expect(state.uploads[2]).toContain('filename="two.png"');
  expect(state.posts[0].searchParams.getAll("imageIds")).toEqual(["101", "103"]);
  expect(state.posts[0].searchParams.has("imageIds[]")).toBe(false); expect(state.deletes).toBe(0);
});

for (const mode of ["OPEN", "resolved appeal", "seller appeal", "missing proof", "foreign buyer", "foreign seller"] as const) test(`availability blocks ${mode}`, async ({ page, baseURL }) => {
  const kind = mode.includes("appeal") ? "PAYMENT_APPEAL" : "DISPUTE";
  const state = await setup(page, baseURL, kind, mode === "seller appeal" || mode === "foreign seller" ? "sales" : "purchase");
  if (mode === "OPEN") state.cases = [{ orderCase: { kind: "CANCELLATION_REQUEST", state: "OPEN" } }];
  if (mode === "resolved appeal") state.cases = [{ orderCase: { kind: "PAYMENT_APPEAL", state: "RESOLVED" } }];
  if (mode === "missing proof") (state.order as { paymentProofImageId?: number | null }).paymentProofImageId = undefined;
  if (mode === "foreign buyer") state.cases = [{ orderCase: { kind: "DISPUTE", state: "RESOLVED" }, buyerId: 999 }];
  if (mode === "foreign seller") state.order.product.sellerId = 999;
  await page.getByRole("button", { name: "Закрыть детали заказа", exact: true }).click();
  if (mode === "missing proof" || mode === "foreign seller") await page.reload();
  await openDetails(page); await expect(page.getByTestId("order-cases").getByRole("progressbar")).toHaveCount(0);
  await expect(form(page).getByRole("button", { name: labels[kind], exact: true })).toHaveCount(0); expect(state.posts).toHaveLength(0);
});

for (const failure of [
  { code: "ORDER_CASE_ALREADY_OPEN", status: 409, message: "По заказу уже открыто обращение" },
  { code: "PAYMENT_APPEAL_ALREADY_EXISTS", status: 409, message: "Обращение об оплате после отмены уже создавалось" },
  { code: "ORDER_CASE_INVALID_TRANSITION", status: 400, message: "Статус заказа, подтверждение оплаты или состояние обращения изменились" },
  { code: "BAD_REQUEST", status: 400, message: "Проверьте непустой комментарий" },
  { code: "INVALID_REQUEST", status: 400, message: "Данные обращения не прошли проверку" },
  { code: "OTHER_CONFLICT", status: 409, message: "Generic backend error" },
]) test(`N1 ${failure.code} keeps comment and updates both reads without an automatic POST retry`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "PAYMENT_APPEAL"); state.failure = failure;
  await form(page).getByRole("button", { name: labels.PAYMENT_APPEAL, exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment); await submit(page).click();
  await expect(form(page).getByText(new RegExp(failure.message))).toBeVisible();
  await expect(form(page).getByLabel("Комментарий обращения")).toHaveValue(comment);
  expect(state.posts).toHaveLength(1); expect(state.reads).toBeGreaterThanOrEqual(3); expect(state.account.ordersReads).toBeGreaterThanOrEqual(3);
  if (failure.code === "OTHER_CONFLICT") await expect(form(page).getByText(/По заказу уже открыто обращение/)).toHaveCount(0);
});

test("another tab creates OPEN after the form opens; preflight rejects the stale action", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "CANCELLATION_REQUEST");
  await form(page).getByRole("button", { name: labels.CANCELLATION_REQUEST, exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment);
  state.cases = [{ orderCase: { id: 90, kind: "CANCELLATION_REQUEST", state: "OPEN", openedBy: 10 } }];
  await submit(page).click(); await expect(form(page).getByText(/Действие больше недоступно/)).toBeVisible();
  expect(state.posts).toHaveLength(0); await expect(submit(page)).toBeDisabled();
});

test("concurrent OPEN during POST returns its specific 409 and blocks creation after reconciliation", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "CANCELLATION_REQUEST");
  let release!: () => void; state.gate = new Promise<void>(resolve => { release = resolve; });
  state.failure = { status: 409, code: "ORDER_CASE_ALREADY_OPEN" };
  await form(page).getByRole("button", { name: labels.CANCELLATION_REQUEST, exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment); await submit(page).click();
  try {
    await expect.poll(() => state.posts.length).toBe(1);
    state.cases = [{ orderCase: { id: 90, orderId: 1, kind: "CANCELLATION_REQUEST", state: "OPEN", openedBy: 10, openingComment: "Конкурентный запрос" } }];
  } finally { release(); }
  await expect(form(page).getByText(/По заказу уже открыто обращение/)).toBeVisible();
  await expect(submit(page)).toBeDisabled();
  await expect(page.getByTestId("order-case-card").getByText("Причина: Конкурентный запрос", { exact: true })).toBeVisible();
  expect(state.posts).toHaveLength(1);
});

test("changed proof after evidence upload prevents stale dispute and permits cancellation without evidence", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "DISPUTE");
  await page.route("**/images?tag=ORDER&entityId=1", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    state.order.paymentProofImageId = null; state.uploads.push("one.png");
    return fulfillJson(route, [77]);
  });
  await form(page).getByRole("button", { name: labels.DISPUTE, exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment);
  await form(page).getByLabel("Доказательства обращения").setInputFiles(files[0]); await submit(page).click();
  await expect(form(page).getByText(/После загрузки файлов состояние заказа изменилось/)).toBeVisible();
  expect(state.posts).toHaveLength(0); expect(state.uploads).toHaveLength(1); expect(state.deletes).toBe(0);
  await form(page).getByRole("button", { name: labels.CANCELLATION_REQUEST, exact: true }).click();
  await expect(form(page).getByLabel("Доказательства обращения")).toHaveCount(0);
  await submit(page).click();
  await expect(form(page).getByText("Обращение создано. Заказ и история обновлены.", { exact: true })).toBeVisible();
  expect(state.posts[0].pathname).toBe("/order/1/cancellation-request"); expect(state.posts[0].searchParams.getAll("imageIds")).toEqual([]);
  expect(state.uploads).toHaveLength(1); expect(state.order.actualStatus).toBe("AWAITING_PAYMENT");
});

for (const mode of ["lost without case", "lost with case", "success then GET failure"] as const) test(`${mode}: reconciles through GET and never repeats POST after reopen`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "CANCELLATION_REQUEST");
  state.lost = mode.startsWith("lost"); state.record = mode !== "lost without case"; state.failAfterPost = mode === "success then GET failure";
  await form(page).getByRole("button", { name: labels.CANCELLATION_REQUEST, exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment); await submit(page).click();
  await expect(form(page).getByText(mode === "lost without case" ? /Результат отправки не подтверждён/ : mode === "lost with case" ? /Обращение создано/ : /Обращение принято\. Не удалось обновить/)).toBeVisible();
  await page.getByRole("button", { name: "Закрыть детали заказа", exact: true }).click(); await openDetails(page);
  await expect(form(page).getByLabel("Комментарий обращения")).toHaveValue(comment); await expect(submit(page)).toBeDisabled();
  await submit(page).dispatchEvent("click"); expect(state.posts).toHaveLength(1);
  if (mode !== "lost with case") {
    state.readStatus = 200; state.account.ordersStatus = 200;
    if (!state.record) state.cases = [{ orderCase: { id: 100, orderId: 1, kind: "CANCELLATION_REQUEST", state: "OPEN", openedBy: 1, openingComment: comment } }];
    await form(page).getByRole("button", { name: "Проверить результат обращения", exact: true }).click();
    await expect(form(page).getByText("Обращение создано. Заказ и история обновлены.", { exact: true })).toBeVisible();
    expect(state.posts).toHaveLength(1);
  }
});

test("pending double submit and remount share one operation", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "PAYMENT_APPEAL");
  let release!: () => void; state.gate = new Promise<void>(resolve => { release = resolve; });
  await form(page).getByRole("button", { name: labels.PAYMENT_APPEAL, exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment); await submit(page).click();
  try {
    await expect.poll(() => state.posts.length).toBe(1);
    await page.getByRole("button", { name: "Закрыть детали заказа", exact: true }).click(); await openDetails(page);
    const pending = form(page).getByRole("button", { name: "Отправка обращения…", exact: true });
    await expect(pending).toBeDisabled(); await pending.dispatchEvent("click"); expect(state.posts).toHaveLength(1);
  } finally { release(); }
  await expect(form(page).getByText("Обращение создано. Заказ и история обновлены.", { exact: true })).toBeVisible();
});

test("failed preflight and changed seller ownership preserve input without POST/upload", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "DISPUTE", "sales");
  await form(page).getByRole("button", { name: labels.DISPUTE, exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment);
  state.readStatus = 500; await submit(page).click();
  await expect(form(page).getByText(/Не удалось прочитать заказ или загрузить файлы/)).toBeVisible();
  state.readStatus = 200; state.order.product.sellerId = 999;
  await page.getByTestId("order-cases").getByRole("button", { name: "Повторить", exact: true }).click();
  await submit(page).click(); await expect(form(page).getByText(/Действие больше недоступно/)).toBeVisible();
  expect(state.posts).toHaveLength(0); expect(state.uploads).toHaveLength(0);
});

test("unmount during upload saves the returned ID and stops before POST until explicit resubmit", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "DISPUTE");
  let release!: () => void, started = false; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/images?tag=ORDER&entityId=1", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    state.uploads.push("one.png"); started = true; await gate; await fulfillJson(route, [77]);
  });
  await form(page).getByRole("button", { name: labels.DISPUTE, exact: true }).click();
  await form(page).getByLabel("Комментарий обращения").fill(comment);
  await form(page).getByLabel("Доказательства обращения").setInputFiles(files[0]); await submit(page).click();
  try {
    await expect.poll(() => started).toBe(true);
    await page.getByRole("button", { name: "Закрыть детали заказа", exact: true }).click();
    await expect(form(page)).toHaveCount(0);
  } finally { release(); }
  await openDetails(page); await expect(form(page).getByText("one.png — загружен", { exact: true })).toBeVisible();
  expect(state.posts).toHaveLength(0); await submit(page).click();
  await expect(form(page).getByText("Обращение создано. Заказ и история обновлены.", { exact: true })).toBeVisible();
  expect(state.uploads).toHaveLength(1); expect(state.posts[0].searchParams.getAll("imageIds")).toEqual(["77"]);
});
