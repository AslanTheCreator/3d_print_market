import { expect, test, type Page } from "@playwright/test";
import { adminCaseFixture, setupAdmin } from "./helpers/admin";
import { expectNoOverflow } from "./helpers/mobileAccount";
import type { OrderCaseKind, OrderCaseResolutionOutcome, OrderStatus } from "@/entities/order";

const comment = "Решение администратора & ? = +";
const labels = { BUYER: "В пользу покупателя", SELLER: "В пользу продавца", CANCELLED: "Отменить заказ", REJECTED: "Отклонить запрос отмены" };
const drawer = (page: Page) => page.getByRole("dialog", { name: "Обращение №301", exact: true });
const forms = (page: Page) => page.getByTestId("admin-case-forms");
const accept = (page: Page) => forms(page).getByRole("button", { name: "Принять решение", exact: true });
async function open(page: Page) { await page.getByRole("button", { name: "Открыть обращение #301", exact: true }).click(); await expect(drawer(page).getByTestId("order-case-card")).toBeVisible(); }
async function fill(page: Page, outcome: OrderCaseResolutionOutcome = "REJECTED") {
  await forms(page).getByRole("combobox", { name: "Исход", exact: true }).click(); await page.getByRole("option", { name: labels[outcome], exact: true }).click();
  await forms(page).getByLabel("Комментарий решения", { exact: true }).fill(comment);
}
async function setup(page: Page, baseURL?: string, kind: OrderCaseKind = "CANCELLATION_REQUEST", previous: OrderStatus = "AWAITING_PAYMENT") {
  const state = await setupAdmin(page, baseURL); state.cases = [adminCaseFixture(301, kind, previous)]; state.orders[0].actualStatus = state.cases[0].orderStatus!;
  await page.goto("/admin/order-cases"); await open(page); return state;
}
async function close(page: Page, dirty = false) {
  if (dirty) page.once("dialog", dialog => dialog.accept());
  await drawer(page).getByRole("button", { name: "Закрыть обращение" }).click(); await expect(drawer(page)).toBeHidden();
}

for (const scenario of [
  { kind: "CANCELLATION_REQUEST", previous: "AWAITING_PAYMENT", outcome: "CANCELLED", status: "CANCELLED" },
  { kind: "CANCELLATION_REQUEST", previous: "AWAITING_PAYMENT", outcome: "REJECTED", status: "AWAITING_PAYMENT" },
  { kind: "DISPUTE", previous: "ASSEMBLING", outcome: "BUYER", status: "FAILED" },
  { kind: "DISPUTE", previous: "ON_THE_WAY", outcome: "SELLER", status: "COMPLETED" },
  { kind: "PAYMENT_APPEAL", previous: "CANCELLED", outcome: "BUYER", status: "CANCELLED" },
  { kind: "PAYMENT_APPEAL", previous: "CANCELLED", outcome: "SELLER", status: "CANCELLED" },
] as const) test(`complete ${scenario.kind}/${scenario.outcome}: private POST, server result, both queues and order status`, async ({ page, baseURL }) => {
  const requests: string[] = []; page.on("request", request => { if (request.method() === "POST") requests.push(request.headers().authorization ?? ""); });
  const state = await setup(page, baseURL, scenario.kind, scenario.previous);
  await expect(drawer(page)).toContainText("Покупатель: #10 · Продавец: #2");
  await expect(drawer(page)).toContainText(/Сумма к оплате:.*6.*000/); await expect(drawer(page)).toContainText("$");
  await expect(drawer(page).getByRole("img")).toHaveCount(3);
  await fill(page, scenario.outcome); await accept(page).click();
  await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
  expect(state.writes).toHaveLength(1); expect(state.writes[0]).toMatchObject({ method: "POST", path: "/admin/actions/order-cases/301/resolve", body: null });
  expect([...new URLSearchParams(state.writes[0].search)]).toEqual([["outcome", scenario.outcome], ["comment", comment]]);
  expect(requests).toEqual(["Bearer admin-test-session"]); expect(state.cases[0].orderStatus).toBe(scenario.status);
  await expect(accept(page)).toBeDisabled(); await close(page);
  await page.getByRole("tab", { name: "Завершённые" }).click(); await expect(page).toHaveURL(/state=RESOLVED/);
  await expect(page.getByRole("button", { name: "Открыть обращение #301" })).toBeVisible(); await open(page);
  await expect(drawer(page).getByTestId("order-case-card")).toContainText(`Комментарий решения: ${comment}`);
  expect(state.writes).toHaveLength(1);
});

test("blank comment and invalid Telegram URLs never write; saved URL allows continued review and preserves decision draft", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  await accept(page).click(); await expect(forms(page).getByText("Напишите непустой комментарий решения")).toBeVisible(); expect(state.writes).toHaveLength(0);
  for (const url of ["http://t.me/a", "https://t.me.evil.test/a", "https://user@t.me/a", "https://example.test/a"]) {
    await forms(page).getByLabel("Telegram-ссылка").fill(url); await forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения" }).click();
    await expect(forms(page).getByText("Укажите HTTPS-ссылку t.me или telegram.me")).toBeVisible(); expect(state.writes).toHaveLength(0);
  }
  await fill(page); await forms(page).getByLabel("Telegram-ссылка").fill("https://telegram.me/review?x=1&y=2");
  await forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения" }).click();
  await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
  expect(state.writes[0].method).toBe("PUT"); expect(new URLSearchParams(state.writes[0].search).get("url")).toBe("https://telegram.me/review?x=1&y=2");
  await expect(drawer(page).getByRole("link", { name: "Обсуждение в Telegram" })).toHaveAttribute("href", "https://telegram.me/review?x=1&y=2");
  await forms(page).getByRole("button", { name: "Продолжить рассмотрение" }).click();
  await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue(comment); await accept(page).click();
  await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён"); expect(state.writes).toHaveLength(2);
});

for (const mode of ["unknown kind", "LEGACY", "RESOLVED", "dispute history"] as const) test(`forbidden outcomes: ${mode}`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.cases = [adminCaseFixture(301, "DISPUTE", "ASSEMBLING")];
  if (mode === "unknown kind") state.cases[0].orderCase!.kind = "FUTURE";
  if (mode === "LEGACY") state.cases[0].orderCase!.outcome = "LEGACY";
  if (mode === "RESOLVED") state.cases[0].orderCase!.state = "RESOLVED";
  await page.goto(`/admin/order-cases?state=${mode === "RESOLVED" ? "RESOLVED" : "OPEN"}`); await open(page);
  if (mode === "dispute history") {
    await forms(page).getByRole("combobox", { name: "Исход" }).click(); await expect(page.getByRole("option", { name: "В пользу продавца", exact: true })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "В пользу покупателя", exact: true })).toBeVisible(); await page.keyboard.press("Escape");
  } else { await expect(accept(page)).toBeDisabled(); await accept(page).dispatchEvent("click"); }
  expect(state.writes).toHaveLength(0);
});

test("queue covers normal and bot orders, uses exact pagination/filter URL and permits return from an empty page", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.cases = Array.from({ length: 51 }, (_, index) => ({ ...adminCaseFixture(301 + index), sellerId: index % 2 ? 999 : 2 }));
  await page.goto("/admin/order-cases?state=OPEN&page=0");
  await expect(page.getByRole("button", { name: /Открыть обращение #/ })).toHaveCount(50);
  await page.getByRole("button", { name: "Далее", exact: true }).click(); await expect(page).toHaveURL(/page=1/);
  await expect(page.getByRole("button", { name: /Открыть обращение #/ })).toHaveCount(1); await expect(page.getByRole("button", { name: "Далее", exact: true })).toBeDisabled();
  expect(state.reads).toContain("/admin/actions/order-cases?state=OPEN&limit=50&offset=50");
  await page.goto("/admin/order-cases?state=OPEN&page=2"); await expect(page.getByText("На этой странице обращений нет. Вернитесь на предыдущую.")).toBeVisible();
  await page.getByRole("button", { name: "Назад", exact: true }).click(); await expect(page).toHaveURL(/page=1/);
  await page.getByRole("tab", { name: "Завершённые" }).click(); await expect(page).toHaveURL(/page=0/); await expect(page.getByText("Обращений в этой выборке нет.")).toBeVisible();
  expect(state.reads.filter(path => path.startsWith("/admin/actions/agents"))).toEqual([]);
});

for (const mode of ["lost applied", "lost not applied", "accepted GET failure", "lost GET failure"] as const) test(`${mode}: immutable attempt survives close/remount and negative GET never authorizes replay`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); state.caseAbort = mode.startsWith("lost"); state.caseApplyBeforeAbort = mode !== "lost not applied"; state.failCaseReadAfterWrite = mode.endsWith("GET failure");
  await fill(page); await accept(page).click();
  await expect(forms(page).getByRole("status")).toContainText(mode === "lost applied" ? "Результат операции подтверждён" : mode === "lost not applied" ? "Результат пока не подтверждён" : "Не удалось обновить");
  const confirmed = mode === "lost applied"; await close(page, !confirmed);
  if (mode !== "lost not applied") await page.getByRole("tab", { name: "Завершённые" }).click();
  await open(page);
  await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue(comment); await expect(accept(page)).toBeDisabled(); await accept(page).dispatchEvent("click"); expect(state.writes).toHaveLength(1);
  if (!confirmed) {
    state.caseReadStatus = 200;
    await forms(page).getByRole("button", { name: "Проверить результат операции" }).click();
    if (mode === "lost not applied") {
      await expect(forms(page).getByRole("status")).toContainText("Результат пока не подтверждён");
      state.cases[0].orderCase = { ...state.cases[0].orderCase, state: "RESOLVED", outcome: "REJECTED", resolutionComment: comment };
      await forms(page).getByRole("button", { name: "Проверить результат операции" }).click();
    }
    await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
  }
  expect(state.writes).toHaveLength(1);
});

test("pending resolve blocks duplicate POST, competing PUT, Escape and close", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); let release!: () => void; state.caseGate = new Promise<void>(resolve => { release = resolve; });
  await fill(page); await accept(page).click();
  try {
    await expect.poll(() => state.writes.length).toBe(1);
    await forms(page).getByRole("button", { name: "Обработка обращения…" }).dispatchEvent("click");
    await forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения" }).dispatchEvent("click");
    await expect(drawer(page).getByRole("button", { name: "Закрыть обращение" })).toBeDisabled(); await page.keyboard.press("Escape");
    await expect(drawer(page)).toBeVisible(); expect(state.writes).toHaveLength(1);
  } finally { release(); }
  await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
});

for (const code of ["ORDER_CASE_ALREADY_RESOLVED", "ORDER_CASE_INVALID_TRANSITION", "ORDER_CASE_INVALID_OUTCOME"] as const) test(`${code}: control GET and server decision preserve rejected input`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); state.caseWriteStatus = code === "ORDER_CASE_ALREADY_RESOLVED" ? 409 : 400; state.caseWriteCode = code;
  if (code === "ORDER_CASE_ALREADY_RESOLVED") state.caseCompeting = { ...adminCaseFixture(), orderCase: { ...adminCaseFixture().orderCase, state: "RESOLVED", outcome: "BUYER", resolutionComment: "Решение другого администратора", resolvedBy: 9 } };
  await fill(page); await accept(page).click();
  await expect(forms(page).getByRole("status")).toContainText(code === "ORDER_CASE_ALREADY_RESOLVED" ? "Другой администратор уже завершил" : code === "ORDER_CASE_INVALID_TRANSITION" ? "Состояние или версия" : "Этот исход недопустим");
  await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue(comment); expect(state.writes).toHaveLength(1);
  if (code === "ORDER_CASE_ALREADY_RESOLVED") { await expect(drawer(page).getByTestId("order-case-card")).toContainText("Решение другого администратора"); await expect(accept(page)).toBeDisabled(); }
  else { state.caseWriteStatus = 200; await expect(accept(page)).toBeEnabled(); await accept(page).click(); await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён"); }
});

test("fresh detail prevents a stale decision when another admin resolves before submit", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); await fill(page);
  state.cases[0].orderCase = { ...state.cases[0].orderCase, state: "RESOLVED", outcome: "CANCELLED", resolutionComment: "Решено ранее" };
  await accept(page).click(); await expect(forms(page).getByRole("status")).toContainText("Обращение изменилось"); expect(state.writes).toHaveLength(0);
  await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue(comment); await expect(accept(page)).toBeDisabled();
});

test("Telegram ALREADY_RESOLVED shows the competing decision and retains the unsaved URL", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); state.caseWriteStatus = 409; state.caseWriteCode = "ORDER_CASE_ALREADY_RESOLVED";
  state.caseCompeting = { ...adminCaseFixture(), orderCase: { ...adminCaseFixture().orderCase, state: "RESOLVED", outcome: "BUYER", resolutionComment: "Конкурентное решение" } };
  await forms(page).getByLabel("Telegram-ссылка").fill("https://t.me/unsaved"); await forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения" }).click();
  await expect(forms(page).getByRole("status")).toContainText("Другой администратор уже завершил");
  await expect(forms(page).getByLabel("Telegram-ссылка")).toHaveValue("https://t.me/unsaved");
  await expect(drawer(page).getByTestId("order-case-card")).toContainText("Конкурентное решение"); expect(state.writes).toHaveLength(1);
});

test("lost Telegram PUT stays locked through remount until the exact saved URL is read", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); state.caseAbort = true;
  await forms(page).getByLabel("Telegram-ссылка").fill("https://t.me/recovery"); await forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения" }).click();
  await expect(forms(page).getByRole("status")).toContainText("Результат пока не подтверждён"); await close(page, true); await open(page);
  await expect(forms(page).getByLabel("Telegram-ссылка")).toHaveValue("https://t.me/recovery"); await expect(accept(page)).toBeDisabled();
  state.cases[0].orderCase!.telegramUrl = "https://t.me/different"; await forms(page).getByRole("button", { name: "Проверить результат операции" }).click();
  await expect(forms(page).getByRole("status")).toContainText("Результат пока не подтверждён");
  state.cases[0].orderCase!.telegramUrl = "https://t.me/recovery"; await forms(page).getByRole("button", { name: "Проверить результат операции" }).click();
  await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён"); expect(state.writes).toHaveLength(1);
});

test("concurrent Telegram edit requires explicit review and untouched field follows a newer GET without overwriting a dirty draft", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  await forms(page).getByLabel("Telegram-ссылка").fill("https://t.me/draft"); state.cases[0].orderCase!.telegramUrl = "https://t.me/newer";
  await forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения" }).click();
  await expect(forms(page).getByRole("status")).toContainText("Ссылка изменена другим администратором");
  await expect(forms(page).getByLabel("Telegram-ссылка")).toHaveValue("https://t.me/draft"); expect(state.writes).toHaveLength(0);
  await expect(drawer(page).getByRole("link", { name: "Обсуждение в Telegram" })).toHaveAttribute("href", "https://t.me/newer");
  await forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения" }).click();
  await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
  await forms(page).getByRole("button", { name: "Продолжить рассмотрение" }).click();
  state.cases[0].orderCase!.telegramUrl = "https://t.me/latest";
  const reads = state.reads.filter(path => path === "/admin/actions/order-cases/301").length;
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online"));
  });
  await expect.poll(() => state.reads.filter(path => path === "/admin/actions/order-cases/301").length).toBeGreaterThan(reads);
  await expect(forms(page).getByLabel("Telegram-ссылка")).toHaveValue("https://t.me/latest");
  await expect(forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения" })).toBeDisabled(); expect(state.writes).toHaveLength(1);
});

test("queue/detail errors recover without fake empty/success; missing currency and CREATE remain explicit", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.caseListStatus = 500;
  await page.goto("/admin/order-cases"); await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible(); await expect(page.getByText("Обращений в этой выборке нет.")).toHaveCount(0);
  state.caseListStatus = 200; await page.getByRole("button", { name: "Повторить" }).click();
  state.caseReadStatus = 403; await page.getByRole("button", { name: "Открыть обращение #301" }).click();
  await expect(drawer(page).getByRole("button", { name: "Повторить" })).toBeVisible(); await expect(accept(page)).toHaveCount(0);
  state.caseReadStatus = 200; state.cases[0].currency = "CREATE"; await drawer(page).getByRole("button", { name: "Повторить" }).click();
  await expect(drawer(page)).toContainText("6000 (техническая валюта CREATE)"); await close(page);
  state.cases[0].currency = undefined; await open(page); await expect(drawer(page)).toContainText("6000 (валюта не указана)");
});

test("ADMIN is checked before queue requests and again before mutation; guest, buyer and revoked role cannot write", async ({ page, baseURL }) => {
  await page.goto("/admin/order-cases"); await expect(page).toHaveURL(/auth\/login/);
  const state = await setupAdmin(page, baseURL, "USER"); state.cases = [adminCaseFixture(301, "CANCELLATION_REQUEST", "AWAITING_PAYMENT")]; await page.goto("/admin/order-cases");
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible(); expect(state.reads.filter(path => path.startsWith("/admin/"))).toEqual([]);
  state.role = "ADMIN"; await page.goto("/admin/order-cases"); await open(page); await fill(page); state.role = "USER";
  await accept(page).click(); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible(); expect(state.writes).toHaveLength(0);
});

test("background access failure freezes retained portal, preserves input and recovers through ADMIN retry", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); await fill(page); state.profileStatus = 500;
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
  await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
  await expect(page.getByText("Не удалось проверить доступ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Принять решение", includeHidden: true }).dispatchEvent("click"); expect(state.writes).toHaveLength(0);
  state.profileStatus = 200; await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByText("Не удалось проверить доступ", { exact: true })).toHaveCount(0);
  await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue(comment); await accept(page).click();
  await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
});

for (const phase of ["preflight", "POST"] as const) test(`real unmount during ${phase} retains the operation and never sends a replacement POST`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); await fill(page);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  if (phase === "POST") state.caseGate = gate; else state.caseReadGate = gate;
  const reads = state.reads.length; await accept(page).click();
  const reconnect = async () => {
    await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
    await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
  };
  try {
    if (phase === "POST") await expect.poll(() => state.writes.length).toBe(1);
    else await expect.poll(() => state.reads.slice(reads).filter(path => path === "/admin/actions/order-cases/301").length).toBeGreaterThan(0);
    state.role = "USER"; await reconnect(); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
    await expect(page.getByTestId("admin-case-forms")).toHaveCount(0);
  } finally { release(); state.caseReadGate = Promise.resolve(); }
  state.role = "ADMIN"; await reconnect(); await expect(drawer(page)).toBeVisible();
  await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue(comment);
  if (phase === "POST") {
    await forms(page).getByRole("button", { name: "Проверить результат операции" }).click();
    await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
  }
  expect(state.writes).toHaveLength(phase === "POST" ? 1 : 0);
});

for (const width of [393, 1280]) test(`Drawer keyboard, dirty navigation, selected URL and private drafts at ${width}px`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width, height: 850 }); const state = await setup(page, baseURL); await fill(page);
  const before = page.url(); page.once("dialog", dialog => dialog.dismiss()); await drawer(page).getByRole("button", { name: "Закрыть обращение" }).click();
  await expect(drawer(page)).toBeVisible(); expect(page.url()).toBe(before);
  await expectNoOverflow(page); expect(await drawer(page).evaluate(node => node.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
  const storage = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage, history.state])); expect(storage).not.toContain(comment);
  await close(page, true); await expect(page).not.toHaveURL(/case=/);
  const button = page.getByRole("button", { name: "Открыть обращение #301" }); await button.focus(); await page.keyboard.press("Enter");
  await expect(drawer(page)).toBeVisible(); await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue(comment);
  await close(page, true); expect(state.writes).toHaveLength(0);
});
