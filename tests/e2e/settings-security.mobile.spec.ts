import { expect, test, type Page } from "@playwright/test";
import { expectNoOverflow } from "./helpers/mobileAccount";
import { setupSettingsAccount } from "./helpers/settingsAccount";

test.setTimeout(90_000);
const save = (page: Page) => page.getByRole("button", { name: "Сохранить", exact: true });
const openCard = (page: Page, label: string) => page.getByRole("button", { name: `Развернуть раздел «${label}»` }).click();

test("settings tabs fit all mobile widths, keep drafts on resize and preserve desktop chrome", async ({ page, baseURL }) => {
  await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/settings?tab=payment");
  await expect(page.getByRole("heading", { name: "Настройки", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "Профиль" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Открыть меню разделов профиля" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Номер карты" })).toBeHidden();
  await expect(page.getByText("•••• 1234").filter({ visible: true })).toBeVisible();
  const switchBounds = await page.getByRole("checkbox").first().boundingBox();
  expect(switchBounds!.width).toBeGreaterThanOrEqual(44);
  expect(switchBounds!.height).toBeGreaterThanOrEqual(44);
  await openCard(page, "Перевод на банковскую карту");
  await page.getByRole("textbox", { name: "Имя получателя" }).fill("Черновик получателя");
  await expect(save(page)).toBeEnabled();
  for (const width of [320, 393, 599, 600, 768, 899, 900, 393]) {
    await page.setViewportSize({ width, height: 727 });
    await expectNoOverflow(page);
    await expect(page.getByRole("textbox", { name: "Имя получателя" })).toHaveValue("Черновик получателя");
    if (width < 900) {
      const tabs = await page.getByRole("tab").evaluateAll((elements) => elements.map((e) => ({ left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })));
      expect(tabs).toHaveLength(4);
      for (const tab of tabs) { expect(tab.left).toBeGreaterThanOrEqual(0); expect(tab.right).toBeLessThanOrEqual(width); expect(tab.width).toBeGreaterThanOrEqual(44); expect(tab.height).toBeGreaterThanOrEqual(44); }
      const action = await save(page).boundingBox();
      const nav = await page.getByRole("navigation", { name: "Основная навигация" }).boundingBox();
      expect(action!.y + action!.height).toBeLessThanOrEqual(nav!.y + 1);
    } else {
      await expect(page.getByRole("heading", { name: "Доставка и оплата", exact: true })).toBeVisible();
    }
  }
  await page.getByRole("tab", { name: "Связь", exact: true }).click();
  await expect(save(page)).toBeHidden();
  await page.getByRole("tab", { name: /^Оплата/ }).click();
  await expect(page.getByRole("textbox", { name: "Имя получателя" })).toHaveValue("Черновик получателя");
  await expect(save(page)).toBeVisible();
});

for (const [tab, collection] of [["address", "/address"], ["shipping", "/transfer"], ["payment", "/accounts"], ["contacts", "/social-networks"]]) {
  test(`${tab} loading and error keep navigation and retry produces a valid empty state`, async ({ page, baseURL }) => {
    const state = await setupSettingsAccount(page, baseURL);
    let release!: () => void;
    state.readGate = new Promise<void>((resolve) => { release = resolve; });
    state.failReads.add(collection);
    await page.goto(`/dashboard/settings?tab=${tab}`);
    await expect(page.getByRole("tab")).toHaveCount(4);
    await expect(page.locator('main [aria-busy="true"]').first()).toBeVisible();
    release();
    await expect(page.getByRole("button", { name: "Повторить", exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(save(page)).toBeHidden();
    state.failReads.clear(); state.records[collection] = [];
    await page.getByRole("button", { name: "Повторить", exact: true }).click();
    await expect(page.getByRole("button", { name: "Повторить", exact: true })).toBeHidden();
    if (tab === "address") await expect(page.getByRole("button", { name: "Добавить адрес", exact: true })).toBeVisible();
    else await expect(page.getByRole("checkbox").first()).not.toBeChecked();
    expect(state.writes).toHaveLength(0);
  });
}

test("dictionary errors retry without presenting an editable incomplete form", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  state.failDictionaries.add("CURRENCY");
  await page.goto("/dashboard/settings?tab=shipping");
  await expect(page.getByRole("button", { name: "Повторить", exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  state.failDictionaries.clear();
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(3);
});

test("background refresh cannot replace a dirty payment draft", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/settings?tab=payment");
  await openCard(page, "Перевод на банковскую карту");
  await page.getByRole("textbox", { name: "Имя получателя" }).fill("Несохранённый ввод");
  state.records["/accounts"][0].username = "Изменено на сервере";
  const before = state.reads["/accounts"];
  await page.clock.setFixedTime(new Date(Date.now() + 6 * 60_000));
  await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
  await expect.poll(() => state.reads["/accounts"]).toBeGreaterThan(before);
  await expect(page.getByRole("textbox", { name: "Имя получателя" })).toHaveValue("Несохранённый ввод");
  await expect(save(page)).toBeEnabled();
});

test("partial save preserves failed entries and retries only outstanding changes", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  state.failWrites.add("BANK_SBP");
  state.records["/accounts"].push({ id: 12, participantId: 1, transferMoney: "CASH", username: "Получатель", entityValue: "При встрече", comment: "Старый комментарий" });
  await page.goto("/dashboard/settings?tab=payment");
  await openCard(page, "Перевод на банковскую карту");
  await page.getByRole("textbox", { name: "Имя получателя" }).fill("Новое имя");
  await page.getByRole("checkbox", { name: "Включить раздел «Перевод по СБП»" }).check();
  await expect(page.getByRole("textbox", { name: "Имя получателя" })).toHaveCount(1);
  await page.getByRole("textbox", { name: "Имя получателя" }).fill("Получатель СБП");
  await page.getByRole("textbox", { name: "Номер телефона" }).fill("+79990000123");
  state.records["/accounts"][1].comment = "Обновлено другим устройством";
  await save(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "Не удалось сохранить:" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Имя получателя" })).toHaveValue("Получатель СБП");
  expect(state.records["/accounts"][0].username).toBe("Новое имя");
  state.failWrites.clear();
  await save(page).click();
  await expect(page.getByRole("status")).toContainText("Изменения сохранены");
  expect(state.writes.filter((write) => write.method === "PUT")).toHaveLength(1);
  expect(state.writes.filter((write) => write.method === "POST")).toHaveLength(2);
  expect(state.records["/accounts"]).toHaveLength(3);
  expect(state.records["/accounts"][1].comment).toBe("Обновлено другим устройством");
});

test("failed reconciliation after create cannot duplicate the successful request", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  state.records["/social-networks"] = [];
  state.failReadsAfterWrite = true;
  await page.goto("/dashboard/settings?tab=contacts");
  await page.getByRole("checkbox", { name: "Включить раздел «Телеграмм аккаунт»" }).check();
  await page.getByRole("textbox", { name: "Имя пользователя" }).fill("@new_contact");
  await save(page).click();
  await expect(page.getByRole("button", { name: "Повторить загрузку", exact: true })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole("textbox", { name: "Имя пользователя" })).toHaveValue("@new_contact");
  state.failReadsAfterWrite = false; state.failReads.clear();
  await page.getByRole("button", { name: "Повторить загрузку", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Изменения сохранены");
  expect(state.writes).toHaveLength(1);
  expect(state.records["/social-networks"]).toHaveLength(1);
});

test("delivery keeps failed input, blocks controls while saving and identifies deletion", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  state.failWrites.add("/transfer/21");
  await page.goto("/dashboard/settings?tab=shipping");
  await openCard(page, "Транспортная компания");
  const price = page.getByRole("textbox", { name: "Стоимость доставки" });
  await price.fill("650");
  let release!: () => void;
  state.writeGate = new Promise<void>((resolve) => { release = resolve; });
  await save(page).click();
  await expect(price).toBeDisabled();
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
  release();
  await expect(page.getByRole("alert").filter({ hasText: "Не удалось сохранить:" })).toBeVisible();
  await expect(price).toHaveValue("650");
  state.failWrites.clear();
  await save(page).click();
  await expect(page.getByRole("status")).toContainText("Изменения сохранены");
  await page.getByRole("checkbox", { name: "Выключить раздел «Транспортная компания»" }).uncheck();
  await expect(page.getByText("Будет удалено после сохранения")).toBeVisible();
  await save(page).click();
  await expect(page.getByRole("status")).toContainText("Изменения сохранены");
  expect(state.records["/transfer"]).toHaveLength(0);
});

test("address draft survives tabs, reports failure and supports save and confirmed deletion", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/settings");
  await page.setViewportSize({ width: 320, height: 727 });
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Добавить новый адрес", exact: true }).click();
  await page.getByRole("textbox", { name: "Город", exact: true }).fill("Казань");
  await page.getByRole("textbox", { name: "Улица", exact: true }).fill("Тестовая");
  await page.getByRole("textbox", { name: "Дом", exact: true }).fill("12А");
  await page.getByRole("textbox", { name: "Почтовый индекс", exact: true }).fill("123456");
  await page.getByRole("tab", { name: "Связь", exact: true }).click();
  await page.getByRole("tab", { name: /^Адреса/ }).click();
  await expect(page.getByRole("textbox", { name: "Город", exact: true })).toHaveValue("Казань");
  state.failWrites.add("/address");
  await page.getByRole("button", { name: "Добавить адрес", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Не удалось сохранить адрес" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Город", exact: true })).toHaveValue("Казань");
  state.failWrites.clear();
  await page.getByRole("button", { name: "Добавить адрес", exact: true }).click();
  await expect(page.getByText("Казань, Россия")).toBeVisible();
  await page.getByRole("button", { name: "Удалить адрес: Тестовая 12А" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Отмена", exact: true }).click();
  expect(state.records["/address"]).toHaveLength(2);
  await page.getByRole("button", { name: "Удалить адрес: Тестовая 12А" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(page.getByText("Казань, Россия")).toBeHidden();
});

test("security has stable hints, accessible visibility buttons and responsive form", async ({ page, baseURL }) => {
  await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/security");
  await expect(page.getByRole("heading", { name: "Безопасность", exact: true })).toBeVisible();
  await expect(page.getByText("Минимум 6 символов")).toBeVisible();
  await expect(page.getByLabel("Текущий пароль", { exact: true })).toHaveAttribute("autocomplete", "current-password");
  await expect(page.getByLabel("Новый пароль", { exact: true })).toHaveAttribute("autocomplete", "new-password");
  for (const width of [320, 393, 599, 600, 768, 899, 900]) {
    await page.setViewportSize({ width, height: 727 });
    await expectNoOverflow(page);
    const toggle = page.getByRole("button", { name: "Показать подтверждение нового пароля", exact: true });
    const bounds = await toggle.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44); expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByLabel("Текущий пароль", { exact: true }).focus();
  await page.keyboard.press("Tab");
  const show = page.getByRole("button", { name: "Показать текущий пароль", exact: true });
  await expect(show).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Скрыть текущий пароль", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("password validation, server failure and success use mock API without losing input", async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/security");
  const old = page.getByLabel("Текущий пароль", { exact: true });
  const next = page.getByLabel("Новый пароль", { exact: true });
  const confirm = page.getByLabel("Повторите пароль", { exact: true });
  const submit = page.getByRole("button", { name: "Изменить пароль", exact: true });
  await old.fill("Mock-old-password"); await next.fill("short"); await confirm.fill("different");
  await submit.click();
  await expect(page.getByText("Пароль должен содержать минимум 6 символов")).toBeVisible();
  expect(state.writes).toHaveLength(0);
  await next.fill("Mock-new-password"); await confirm.fill("Mock-new-password");
  state.passwordError = true;
  await submit.click();
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  await expect(next).toHaveValue("Mock-new-password");
  state.passwordError = false;
  await page.getByRole("button", { name: "Показать новый пароль", exact: true }).click();
  let release!: () => void;
  state.writeGate = new Promise<void>((resolve) => { release = resolve; });
  await submit.click();
  await expect(old).toBeDisabled();
  release();
  await expect(next).toHaveValue("");
  await expect(next).toHaveAttribute("type", "password");
  await expect(submit).toBeDisabled();
});
