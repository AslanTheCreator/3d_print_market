import { expect, test, type Page } from "@playwright/test";
import { adminCaseFixture, setupAdmin } from "./helpers/admin";
import { fulfillJson } from "./helpers/mobileAccount";

const forms = (page: Page) => page.getByTestId("admin-case-forms");
const accept = (page: Page) => forms(page).getByRole("button", { name: /^(Принять решение|Обработка обращения…)$/ });
const save = (page: Page) => forms(page).getByRole("button", { name: "Сохранить ссылку обсуждения", exact: true });
const check = (page: Page) => forms(page).getByRole("button", { name: "Проверить результат операции", exact: true });
const proceed = (page: Page) => forms(page).getByRole("button", { name: "Продолжить рассмотрение", exact: true });
const drawer = (page: Page, id = 301) => page.getByRole("dialog", { name: `Обращение №${id}`, exact: true });
async function open(page: Page, id = 301) { await page.getByRole("button", { name: `Открыть обращение #${id}`, exact: true }).click(); await expect(drawer(page, id).getByTestId("order-case-card")).toBeVisible(); }
async function close(page: Page, id = 301) {
  const confirm = (dialog: import("@playwright/test").Dialog) => dialog.accept();
  page.on("dialog", confirm);
  try { await drawer(page, id).getByRole("button", { name: "Закрыть обращение", exact: true }).click(); await expect(drawer(page, id)).toBeHidden(); }
  finally { page.off("dialog", confirm); }
}
async function fill(page: Page) { await forms(page).getByRole("combobox", { name: "Исход", exact: true }).click(); await page.getByRole("option", { name: "Отклонить запрос отмены", exact: true }).click(); await forms(page).getByLabel("Комментарий решения").fill("Решение независимо от Telegram PUT"); }
async function setup(page: Page, baseURL?: string) {
  const state = await setupAdmin(page, baseURL); state.cases = [adminCaseFixture(301, "CANCELLATION_REQUEST", "AWAITING_PAYMENT"), adminCaseFixture(302, "CANCELLATION_REQUEST", "AWAITING_PAYMENT", 202)];
  await page.goto("/admin/order-cases"); await open(page); await fill(page); return state;
}
async function reconnect(page: Page) { await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000)); await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); }); }

for (const unknown of [false, true]) test(`Telegram accepted=${!unknown}, failed control GET, then OPEN/B: resolve survives Drawer/case remount without PUT replay`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); state.failCaseReadAfterWrite = true; state.caseAbort = unknown; state.caseApplyBeforeAbort = true;
  await forms(page).getByLabel("Telegram-ссылка").fill("https://t.me/link_A"); await save(page).click();
  await expect(forms(page).getByRole("status")).toContainText("Не удалось обновить"); expect(state.writes).toHaveLength(1);
  await expect(accept(page)).toBeDisabled(); await expect(proceed(page)).toHaveCount(0);
  await close(page); state.caseReadStatus = 200; await open(page, 302); await expect(accept(page)).toBeEnabled(); await close(page, 302);
  state.cases[0].orderCase!.telegramUrl = "https://t.me/link_B"; state.caseReadStatus = 200;
  state.failCaseReadAfterWrite = false; state.caseAbort = false;
  await open(page); await check(page).click();
  await expect(drawer(page).getByRole("link", { name: "Обсуждение в Telegram" })).toHaveAttribute("href", "https://t.me/link_B");
  await expect(forms(page).getByRole("status")).toContainText(unknown ? "Результат пока не подтверждён" : "Запрос принят, но текущая ссылка отличается");
  await expect(accept(page)).toBeDisabled(); await proceed(page).click();
  await expect(accept(page)).toBeEnabled(); await expect(save(page)).toBeDisabled();
  await expect(forms(page).getByLabel("Telegram-ссылка")).toHaveValue("https://t.me/link_A");
  await close(page); await open(page);
  await expect(accept(page)).toBeEnabled(); await expect(save(page)).toBeDisabled(); await save(page).dispatchEvent("click");
  await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue("Решение независимо от Telegram PUT");
  await accept(page).click(); await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
  expect(state.writes.map(write => write.method)).toEqual(["PUT", "POST"]);
  expect(new URLSearchParams(state.writes[0].search).get("url")).toBe("https://t.me/link_A");
  expect(new URLSearchParams(state.writes[1].search).get("outcome")).toBe("REJECTED");
  expect(state.cases[0].orderCase!.telegramUrl).toBe("https://t.me/link_B"); expect(state.cases[0].orderStatus).toBe("AWAITING_PAYMENT");
});

test("truly pending PUT excludes resolve and replay and survives role unmount", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); let release!: () => void; state.caseGate = new Promise<void>(resolve => { release = resolve; });
  await forms(page).getByLabel("Telegram-ссылка").fill("https://t.me/pending_A"); await save(page).click();
  try {
    await expect.poll(() => state.writes.length).toBe(1); await expect(accept(page)).toBeDisabled(); await expect(proceed(page)).toHaveCount(0);
    await accept(page).dispatchEvent("click"); await save(page).dispatchEvent("click");
    await expect(drawer(page).getByRole("button", { name: "Закрыть обращение" })).toBeDisabled();
    state.role = "USER"; await reconnect(page); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
    state.role = "ADMIN"; await reconnect(page); await expect(forms(page)).toBeVisible();
    await expect(accept(page)).toBeDisabled(); await expect(proceed(page)).toHaveCount(0); expect(state.writes).toHaveLength(1);
  } finally { release(); }
  await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён"); await proceed(page).click();
  await accept(page).click(); await expect(forms(page).getByRole("status")).toContainText("Результат операции подтверждён");
  expect(state.writes.map(write => write.method)).toEqual(["PUT", "POST"]);
});

test("a late pre-PUT GET cannot replace OPEN/B recovery; revoked ADMIN and a resolved case still forbid resolve", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  let release!: () => void, started = false, finished = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const old = structuredClone(state.cases[0]);
  await page.route("http://127.0.0.1:9/admin/actions/order-cases/301", async route => {
    if (route.request().method() !== "GET") return route.fallback();
    started = true; await gate; await fulfillJson(route, old).catch(() => {}); finished = true;
  }, { times: 1 });
  await reconnect(page); await expect.poll(() => started).toBe(true);
  try {
    // Закрытие отменяет старое чтение; его серверный ответ остаётся задержанным.
    await close(page); await open(page);
    state.failCaseReadAfterWrite = true; await forms(page).getByLabel("Telegram-ссылка").fill("https://t.me/link_A"); await save(page).click();
    await expect(forms(page).getByRole("status")).toContainText("Не удалось обновить");
    state.failCaseReadAfterWrite = false; state.caseReadStatus = 200; state.cases[0].orderCase!.telegramUrl = "https://t.me/link_B";
    await check(page).click(); await proceed(page).click(); await expect(accept(page)).toBeEnabled();
  } finally { release(); }
  await expect.poll(() => finished).toBe(true);
  await expect(drawer(page).getByRole("link", { name: "Обсуждение в Telegram" })).toHaveAttribute("href", "https://t.me/link_B");
  await expect(accept(page)).toBeEnabled();
  state.role = "USER"; await accept(page).click(); await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible(); expect(state.writes).toHaveLength(1);
  state.role = "ADMIN"; state.cases[0].orderCase = { ...state.cases[0].orderCase, state: "RESOLVED", outcome: "CANCELLED", resolutionComment: "Решение другого ADMIN" };
  await reconnect(page); await expect(forms(page)).toBeVisible(); await expect(accept(page)).toBeDisabled(); await expect(save(page)).toBeDisabled();
  await expect(forms(page).getByLabel("Комментарий решения")).toHaveValue("Решение независимо от Telegram PUT");
  await accept(page).dispatchEvent("click"); expect(state.writes).toHaveLength(1);
});
