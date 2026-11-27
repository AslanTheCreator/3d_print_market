import { expect, test } from "@playwright/test";
import { adminReviewFixture } from "./helpers/adminPaymentReview";
import { adminOrderFixture, setupAdmin } from "./helpers/admin";
import { fulfillJson } from "./helpers/mobileAccount";

for (const prepayment of [true, false]) for (const action of ["approve", "return"] as const) {
  test(`admin ${action} on ${prepayment ? "prepayment" : "full payment"} checks one receipt and posts once`, async ({ page, baseURL }) => {
    const { state, posts, dialog, checkbox, approve, sendBack, reason, apply } = await adminReviewFixture(page, baseURL, prepayment, prepayment);
    const message = "Я".repeat(500);
    await expect(approve).toBeDisabled();
    await checkbox.check();
    await reason.fill("   ");
    await expect(sendBack).toBeDisabled();
    await reason.fill(message + "!");
    await expect(sendBack).toBeDisabled();
    await reason.fill(" " + message + " ");
    await expect(sendBack).toBeEnabled();
    let release!: () => void;
    state.reviewGate = new Promise(resolve => { release = resolve; });
    try {
      const button = action === "approve" ? approve : sendBack;
      await button.evaluate(el => {
        if (!(el instanceof HTMLButtonElement)) throw Error("Expected a decision button");
        const form = el.form!;
        form.requestSubmit(el);
        form.requestSubmit(el);
        form.requestSubmit(form.querySelector<HTMLButtonElement>(el.getAttribute("value") === "approve" ? "[value=return]" : "[value=approve]")!);
      });
      await expect.poll(() => state.writes).toEqual([{ path: `/admin/actions/agents/2/orders/201/payments/review/${action}`,
        method: "POST", body: { expectedVersion: 0, ...(action === "return" && { reason: message }) }, search: "" }]);
      apply(action, message);
    } finally { release(); }
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
    await expect(dialog.getByText("Статус заказа изменился.")).toBeVisible();
    expect(posts).toEqual([`/admin/actions/agents/2/orders/201/payments/review/${action}`]);
    expect(state.reads.some(path => path === "/admin/actions/agents/2/orders/201/terms-history")).toBe(true);
    expect(state.reads.filter(path => path.startsWith("/order/") || path.includes("page=1"))).toEqual([]);
  });
}

for (const [status, action] of [[408, "approve"], [503, "return"], [200, "approve"], [0, "return"], [0, "approve"]] as const) {
  test(`admin uncertain ${status} ${action} retains reservation through remount until history and money agree`, async ({ page, baseURL }) => {
    const { state, order, posts, dialog, checkbox, approve, sendBack, reason, check, apply } = await adminReviewFixture(page, baseURL);
    state.actionStatus = status || 200;
    state.actionAbort = !status;
    state.reviewResponse = "201";
    await checkbox.check(); await reason.fill("Неверный чек");
    await (action === "approve" ? approve : sendBack).click();
    await expect(check).toBeVisible();
    await dialog.getByRole("button", { name: "Закрыть" }).click();
    const details = page.getByRole("dialog", { name: "Детали заказа" });
    await details.getByRole("button", { name: "Закрыть", exact: true }).click();
    await page.getByRole("button", { name: "Обновить", exact: true }).click();
    await page.getByRole("button", { name: "Открыть заказ #201" }).click();
    await details.getByRole("button", { name: "Проверить результат" }).click();
    await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
    apply(action, "Неверный чек", 2);
    await check.click();
    await expect(check).toBeVisible();
    state.reviewHistory[201][0].actor_id = 1;
    state.reviewHistoryStatus = 503;
    await check.click();
    await expect(check).toBeVisible();
    state.reviewHistoryStatus = 200;
    const balance = order.calculation!.remainingAmount;
    order.calculation!.remainingAmount = "123.00";
    await check.click();
    await expect(check).toBeVisible();
    order.calculation!.remainingAmount = balance;
    await check.click();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
    expect(posts).toEqual([`/admin/actions/agents/2/orders/201/payments/review/${action}`]);
  });
}

test("replaced proof clears the admin decision, contradictory history blocks both actions", async ({ page, baseURL }) => {
  const { state, order, posts, dialog, checkbox, approve, reason, sendBack, apply } = await adminReviewFixture(page, baseURL);
  await checkbox.check(); await reason.fill("Для чека A");
  apply("return", "Возвращено продавцом", 2);
  Object.assign(order, { actualStatus: "AWAITING_PAYMENT_APPROVAL", termsVersion: 2, paymentProofImageId: 78 });
  state.reviewHistory[201].push({ id: 9, actor_id: 10, kind: "PAYMENT_SUBMITTED", payload: '{"imageId":79,"expectedVersion":1}' });
  await approve.click();
  await expect(dialog.getByAltText("Текущий чек №78")).toBeVisible();
  await expect(checkbox).not.toBeChecked(); await expect(reason).toHaveValue("");
  await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
  await checkbox.check(); await reason.fill("Новый ввод");
  await expect(approve).toBeDisabled(); await expect(sendBack).toBeDisabled();
  expect(posts).toEqual([]);
});

for (const problem of ["wrong agent", "corrupt version", "role lost", "account changed"] as const) {
  test(`admin preflight refuses ${problem} without participant fallback`, async ({ page, baseURL }) => {
    const { order, posts, dialog, reason, sendBack, state } = await adminReviewFixture(page, baseURL);
    await reason.fill("Вернуть");
    await expect(sendBack).toBeEnabled();
    if (problem === "wrong agent") order.sellerId = 3;
    if (problem === "corrupt version") await page.route("**/admin/actions/agent-orders?*", route => route.request().method() === "OPTIONS" ? fulfillJson(route, null) : route.fulfill({
      contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify([order]).replace('"termsVersion":0', '"termsVersion":1.00000000000000001'),
    }));
    if (problem === "role lost") state.role = "USER";
    if (problem === "account changed") await page.route("**/auth/profile", route => fulfillJson(route, { id: 99, role: "ADMIN" }));
    await sendBack.click();
    if (problem === "role lost" || problem === "account changed") await expect(dialog).toBeHidden();
    else await expect(dialog.getByText(/Решение не отправлено/)).toBeVisible();
    expect(posts).toEqual([]);
    expect(state.reads.filter(path => path.startsWith("/order/"))).toEqual([]);
  });
}

test("missing root sellerId does not enable an admin review or a participant fallback", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.orders = [adminOrderFixture(201, "AWAITING_PAYMENT_APPROVAL")];
  Object.assign(state.orders[0], { sellerId: null, paymentProofImageId: 77 });
  await page.goto("/admin/orders?status=all");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await expect(page.getByText(/Обновите данные заказа и полномочия/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Проверить оплату" })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

for (const delay of ["read", "write"] as const) {
  test(`switching agent isolates a late admin ${delay} from the new order`, async ({ page, baseURL }) => {
    const { state, reason, sendBack, dialog, posts } = await adminReviewFixture(page, baseURL);
    const next = adminOrderFixture(202, "AWAITING_PAYMENT_APPROVAL");
    Object.assign(next, { sellerId: 3, sellerLogin: "bot-three", paymentProofImageId: 78 });
    state.orders.push(next);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let waiting = false;
    if (delay === "read") {
      await page.route("**/agents/2/orders/201/terms-history", async route => {
        if (route.request().method() === "GET") { waiting = true; await gate; }
        await fulfillJson(route, []);
      });
    } else state.reviewGate = gate;
    try {
      await reason.fill("Только для первого агента"); await sendBack.click();
      await expect.poll(() => delay === "read" ? waiting : posts.length === 1).toBe(true);
      await page.evaluate(() => history.pushState(null, "", "/admin/orders?agent=3&status=all"));
      await expect(dialog).toBeHidden();
      await page.getByRole("button", { name: "Открыть заказ #202" }).click();
      await page.getByRole("button", { name: "Проверить оплату" }).click();
      const second = page.getByRole("dialog", { name: "Проверка платежа по заказу №202" });
      await expect(second.getByText("Агент #3")).toBeVisible();
      await expect(second.getByAltText("Текущий чек №78")).toBeVisible();
      await expect(second.getByLabel("Причина возврата")).toHaveValue("");
      release();
      await second.getByLabel("Причина возврата").fill("Для второго агента");
      await second.getByRole("button", { name: "Вернуть на повторную оплату" }).click();
      await expect(second.getByRole("button", { name: "Проверить результат" })).toBeVisible();
      expect(posts).toEqual([...(delay === "write" ? ["/admin/actions/agents/2/orders/201/payments/review/return"] : []),
        "/admin/actions/agents/3/orders/202/payments/review/return"]);
    } finally { release(); }
  });
}

test("admin observes a known OPEN case and sends neither decision", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.orders = [adminOrderFixture(201, "AWAITING_PAYMENT_APPROVAL")];
  state.orders[0].paymentProofImageId = 77;
  await page.goto("/admin/order-cases");
  await expect(page.getByRole("button", { name: "Открыть обращение #301" })).toBeVisible();
  await page.getByRole("link", { name: "Заказы", exact: true }).click();
  await page.getByRole("combobox", { name: "Статус заказа" }).click();
  await page.getByRole("option", { name: "Все статусы" }).click();
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Проверить оплату" }).click();
  const dialog = page.getByRole("dialog", { name: "Проверка платежа по заказу №201" });
  await dialog.getByRole("checkbox").check(); await dialog.getByLabel("Причина возврата").fill("Причина");
  await expect(dialog.getByRole("button", { name: "Подтвердить оплату" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Вернуть на повторную оплату" })).toBeDisabled();
  expect(state.writes).toEqual([]);
});

test("stale admin BOOKED cannot cancel while a review awaits reconciliation", async ({ page, baseURL }) => {
  const { state, order, dialog, check, reason, sendBack, posts } = await adminReviewFixture(page, baseURL);
  state.actionStatus = 503;
  await reason.fill("Причина"); await sendBack.click(); await expect(check).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть" }).click();
  const details = page.getByRole("dialog", { name: "Детали заказа" });
  await details.getByRole("button", { name: "Закрыть", exact: true }).click();
  order.actualStatus = "BOOKED";
  await page.evaluate(() => history.pushState(null, "", "/admin/orders?status=BOOKED"));
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  const cancel = details.getByRole("button", { name: "Отменить заказ" });
  await expect(cancel).toBeDisabled();
  await cancel.dispatchEvent("click");
  expect(posts).toEqual(["/admin/actions/agents/2/orders/201/payments/review/return"]);
});

test("lost admin return can be verified after two more payment cycles", async ({ page, baseURL }) => {
  const { state, order, posts, dialog, reason, sendBack, check, apply } = await adminReviewFixture(page, baseURL);
  state.actionAbort = true;
  await reason.fill("Чек A"); await sendBack.click(); await expect(check).toBeVisible();
  apply("return", "Чек A");
  state.reviewHistory[201].push(
    { id: 9, actor_id: 10, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":1,"imageId":78}' },
    { id: 10, actor_id: 2, kind: "PAYMENT_RETURNED", payload: '{"imageId":78,"confirmedPaidAmount":"1000","request":{"expectedVersion":2,"reason":"Чек B"}}' },
    { id: 11, actor_id: 10, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":3,"imageId":79}' },
    { id: 12, actor_id: 2, kind: "PAYMENT_APPROVED", payload: '{"imageId":79,"confirmedPaidAmount":"4500","request":{"expectedVersion":4}}' });
  Object.assign(order, { termsVersion: 5, actualStatus: "ON_THE_WAY", paymentProofImageId: 79 });
  Object.assign(order.calculation!, { remainingAmount: "0.00", confirmedPaidAmount: "4500.00" });
  await check.click();
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  expect(posts).toEqual(["/admin/actions/agents/2/orders/201/payments/review/return"]);
});

test("stale admin money and a stale list cannot enable a second review", async ({ page, baseURL }) => {
  const { state, order, dialog, checkbox, approve, check, apply, posts } = await adminReviewFixture(page, baseURL);
  const old = structuredClone(order);
  await checkbox.check(); await approve.click(); await expect(check).toBeVisible();
  apply("approve"); await check.click();
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть" }).click();
  await page.getByRole("link", { name: "Обращения по всем заказам" }).click();
  await expect(page.getByRole("heading", { name: "Обращения по заказам" })).toBeVisible();
  state.orders = [old];
  await page.getByRole("link", { name: "Заказы", exact: true }).click();
  await page.getByRole("combobox", { name: "Статус заказа" }).click();
  await page.getByRole("option", { name: "Все статусы" }).click();
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await expect(page.getByRole("button", { name: "Проверить оплату" })).toBeDisabled();
  expect(posts).toEqual(["/admin/actions/agents/2/orders/201/payments/review/approve"]);
});

for (const [status, code, rejected] of [
  [400, "ORDER_PAYMENT_INVALID", true], [403, "ACCESS_DENIED", true], [404, "ORDER_NOT_FOUND", true],
  [404, "UNKNOWN", false], [400, "PARTICIPANT_NOT_FOUND", false],
  [409, "ORDER_LEGACY_RECONCILIATION_REQUIRED", true], [400, "AGENT_UNKNOWN", false], [403, "UNKNOWN", false],
] as const) {
  test(`admin classifies ${status} ${code} and performs no automatic retry`, async ({ page, baseURL }) => {
    const { state, dialog, posts, reason, sendBack, check } = await adminReviewFixture(page, baseURL);
    state.actionStatus = status; state.reviewResponse = { code, message: "Отказ проверки" };
    await reason.fill("Чек"); await sendBack.click();
    if (rejected) {
      await expect(dialog.getByText("Отказ проверки")).toBeVisible();
      await expect(sendBack).toBeEnabled();
    } else {
      await expect(check).toBeVisible(); await check.click(); await expect(check).toBeVisible();
      await expect(sendBack).toBeDisabled();
    }
    expect(posts).toEqual(["/admin/actions/agents/2/orders/201/payments/review/return"]);
  });
}

test("admin token refresh does not replay the review POST", async ({ page, baseURL, context }) => {
  const { state, posts, reason, sendBack, dialog } = await adminReviewFixture(page, baseURL);
  await context.addCookies([{ name: "refresh_token", value: "fixture-refresh", url: baseURL! },
    { name: "token_created_at", value: String(Date.now()), url: baseURL! }]);
  await page.route("**/auth/refresh", route => route.fulfill({
    status: route.request().method() === "OPTIONS" ? 204 : 200,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" },
    contentType: "application/json", body: route.request().method() === "OPTIONS" ? "" : JSON.stringify("renewed"),
  }));
  state.actionStatus = 401; state.reviewResponse = { code: "TOKEN_INVALID_OR_EXPIRED", message: "Токен истёк" };
  await reason.fill("Чек"); await sendBack.click();
  await expect(dialog.getByText("Токен истёк")).toBeVisible();
  await expect(sendBack).toBeEnabled();
  expect(posts.filter(path => path.includes("/payments/"))).toEqual(["/admin/actions/agents/2/orders/201/payments/review/return"]);
  expect(posts.filter(path => path === "/auth/refresh")).toHaveLength(1);
});

test("ADMIN only confirms a loaded authenticated receipt, and can retry its GET", async ({ page, baseURL }) => {
  const { state, dialog, approve, checkbox, posts } = await adminReviewFixture(page, baseURL);
  await checkbox.check();
  await expect(approve).toBeEnabled();
  state.proofStatus = 503;
  const proof = (ok: boolean) => page.waitForResponse(response => response.request().method() === "GET" &&
    new URL(response.url()).pathname === "/images" && new URL(response.url()).searchParams.get("ids") === "77" && response.ok() === ok);
  const failed = proof(false);
  await dialog.getByRole("button", { name: "Перечитать чек" }).click();
  await failed;
  await expect(approve).toBeDisabled();
  state.proofStatus = 200;
  const fresh = proof(true);
  await dialog.getByRole("button", { name: "Перечитать чек" }).click();
  expect((await fresh).request().headers().authorization).toBe("Bearer admin-test-session");
  await checkbox.check();
  await expect(approve).toBeEnabled();
  expect(posts).toEqual([]);
});

test("bad admin agent filter cannot turn a global row into a review", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.orders = [adminOrderFixture(201, "AWAITING_PAYMENT_APPROVAL")];
  await page.goto("/admin/orders?status=all&agent=invalid");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await expect(page.getByText("Обновите выбор агента для проверки платежа.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Проверить оплату" })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("ADMIN 409 stale requires a newer admin order and a new decision", async ({ page, baseURL }) => {
  const { state, order, dialog, posts, checkbox, approve, check } = await adminReviewFixture(page, baseURL);
  state.actionStatus = 409;
  state.reviewResponse = { code: "ORDER_TERMS_STALE", message: "Версия устарела" };
  await checkbox.check(); await approve.click();
  await expect(check).toBeVisible(); await check.click(); await expect(check).toBeVisible();
  Object.assign(order, { termsVersion: 2, paymentProofImageId: 78 });
  state.reviewHistory[201].push(
    { id: 7, actor_id: 2, kind: "PAYMENT_RETURNED", payload: '{"imageId":77,"confirmedPaidAmount":"1000","request":{"expectedVersion":0,"reason":"Чек A"}}' },
    { id: 8, actor_id: 10, kind: "PAYMENT_SUBMITTED", payload: '{"imageId":78,"expectedVersion":1}' });
  await check.click();
  await expect(dialog.getByAltText("Текущий чек №78")).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await expect(approve).toBeDisabled();
  await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
  await checkbox.check(); await expect(approve).toBeEnabled();
  expect(posts).toEqual(["/admin/actions/agents/2/orders/201/payments/review/approve"]);
});

test("404 for a missing agent releases review only after successful control reads", async ({ page, baseURL }) => {
  const { state, reason, sendBack, check, posts } = await adminReviewFixture(page, baseURL);
  state.actionStatus = 404;
  state.reviewResponse = { code: "PARTICIPANT_NOT_FOUND", message: "Агент недоступен" };
  let release!: () => void;
  state.reviewGate = new Promise(resolve => { release = resolve; });
  await reason.fill("Чек");
  await sendBack.click();
  await expect.poll(() => posts.length).toBe(1);
  state.orderReadStatus = 503;
  release();
  await expect(check).toBeVisible();
  state.orderReadStatus = 200;
  state.reviewHistoryStatus = 503;
  await check.click();
  await expect(check).toBeEnabled();
  state.reviewHistoryStatus = 200;
  await check.click();
  await expect(sendBack).toBeEnabled();
  expect(posts).toHaveLength(1);
  await sendBack.click();
  await expect.poll(() => posts.length).toBe(2);
});

test("OPEN rejection survives closing review until the identified case is resolved", async ({ page, baseURL }) => {
  const { state, dialog, check, sendBack, reason, posts } = await adminReviewFixture(page, baseURL);
  state.actionStatus = 409;
  state.reviewResponse = { code: "ORDER_CASE_ALREADY_OPEN", message: "Есть открытое обращение" };
  await reason.fill("Чек");
  await sendBack.click();
  await expect(check).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Проверить результат", exact: true }).click();
  await check.click();
  await expect(check).toBeEnabled();
  await expect(sendBack).toBeDisabled();
  expect(posts).toHaveLength(1);
  state.cases[0].orderCase!.state = "RESOLVED";
  await check.click();
  await reason.fill("Новый запрос");
  await expect(sendBack).toBeEnabled();
  expect(posts).toHaveLength(1);
  await sendBack.click();
  await expect.poll(() => posts.length).toBe(2);
});

test("closing review after the row leaves its filter clears the detail selection", async ({ page, baseURL }) => {
  const { state, reason, sendBack, check, dialog, apply } = await adminReviewFixture(page, baseURL);
  state.actionStatus = 503;
  await reason.fill("Чек");
  await sendBack.click();
  await expect(check).toBeVisible();
  apply("return", "Чек");
  await check.click();
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Детали заказа" });
  await expect(detail).toBeHidden();
  await page.getByRole("combobox", { name: "Статус заказа" }).click();
  await page.getByRole("option", { name: "Все статусы" }).click();
  const open = page.getByRole("button", { name: "Открыть заказ #201" });
  await expect(open).toBeVisible();
  await expect(detail).toBeHidden();
  await open.click();
  await expect(detail).toBeVisible();
});

test("an uncertain review disables saving delivery terms and explains why", async ({ page, baseURL }) => {
  const { state, order, reason, sendBack, dialog, check, posts } = await adminReviewFixture(page, baseURL);
  state.actionStatus = 503;
  await reason.fill("Чек");
  await sendBack.click();
  await expect(check).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("dialog", { name: "Детали заказа" }).getByRole("button", { name: "Закрыть", exact: true }).click();
  Object.assign(order, { actualStatus: "AWAITING_PAYMENT", termsVersion: 1, deliveryCarrier: "YANDEX", deliveryAddress: "ПВЗ" });
  await page.evaluate(() => history.pushState(null, "", "/admin/orders?agent=2&status=all"));
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Изменить условия доставки" }).click();
  await expect(page.getByText(/Проверка платежа ещё не завершена/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить условия" })).toBeDisabled();
  expect(state.writes.filter(request => request.method === "PUT")).toEqual([]);
  await page.getByRole("button", { name: "Закрыть форму" }).click();
  state.reviewHistory[201].push({ id: 8, actor_id: 1, kind: "PAYMENT_RETURNED",
    payload: JSON.stringify({ imageId: 77, confirmedPaidAmount: "1000.00", request: { expectedVersion: 0, reason: "Чек" } }) });
  await page.getByRole("button", { name: "Проверить результат" }).click();
  await check.click();
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Изменить условия доставки" }).click();
  await page.getByLabel("Стоимость доставки (RUB)").fill("600.00");
  await page.getByLabel("Причина изменения").fill("Новый тариф");
  await page.getByRole("button", { name: "Сохранить условия" }).click();
  await expect.poll(() => state.writes.filter(request => request.method === "PUT").length).toBe(1);
  expect(posts).toHaveLength(1);
});

test("the same admin review can be reconciled on the actual second page", async ({ page, baseURL }) => {
  const { state, order, reason, sendBack, check, dialog, posts, apply } = await adminReviewFixture(page, baseURL);
  state.actionAbort = true;
  await reason.fill("Чек");
  await sendBack.click();
  await expect(check).toBeVisible();
  apply("return", "Чек");
  state.orders = [...Array.from({ length: 50 }, (_, i) => adminOrderFixture(501 + i, "COMPLETED")), order];
  await check.click();
  await expect(check).toBeVisible();
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.evaluate(() => history.pushState(null, "", "/admin/orders?agent=2&status=all&page=1"));
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Проверить результат" }).click();
  await check.click();
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  expect(posts).toHaveLength(1);
});
