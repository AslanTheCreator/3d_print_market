import { expect, test } from "@playwright/test";
import { fulfillJson } from "./helpers/mobileAccount";
import { setupSettingsAccount } from "./helpers/settingsAccount";

const settings = [
  {
    tab: "payment",
    path: "/accounts",
    code: "ACCOUNT_NOT_FOUND",
    label: "Перевод на банковскую карту",
    fields: { "Имя получателя": "Тестовый получатель", "Номер карты": "4000000000001234" },
    payload: {
      transferMoney: "BANK_CARD",
      username: "Тестовый получатель",
      entityValue: "4000000000001234",
      comment: "",
    },
  },
  {
    tab: "contacts",
    path: "/social-networks",
    code: "SOCIAL_NETWORK_NOT_FOUND",
    label: "Телеграмм аккаунт",
    fields: { "Имя пользователя": "@test_contact" },
    payload: { type: "TELEGRAM", login: "@test_contact" },
  },
];

for (const setting of settings) {
  test(`${setting.tab}: domain 404 allows creating the first and deleting the last entry`, async ({ page, baseURL }) => {
    const state = await setupSettingsAccount(page, baseURL);
    state.records[setting.path] = [];
    let emptyReads = 0;
    await page.route(`http://127.0.0.1:9${setting.path}`, (route) => {
      if (route.request().method() === "GET" && !state.records[setting.path].length) {
        emptyReads++;
        return fulfillJson(route, { code: setting.code, message: "Настройки отсутствуют", status: 404 }, 404);
      }
      return route.fallback();
    });

    await page.goto(`/dashboard/settings?tab=${setting.tab}`);
    const loadError = page.getByRole("alert").filter({ hasText: "Не удалось загрузить настройки" });
    const save = page.getByRole("button", { name: "Сохранить", exact: true });
    const enable = () => page.getByRole("checkbox", { name: `Включить раздел «${setting.label}»` });
    await expect(enable()).toBeVisible();
    await expect(enable()).not.toBeChecked();
    await expect(loadError).toBeHidden();
    expect(emptyReads).toBe(1);
    expect(state.writes).toHaveLength(0);

    await enable().check();
    for (const [label, value] of Object.entries(setting.fields)) {
      await page.getByRole("textbox", { name: label, exact: true }).fill(value);
    }
    await save.click();
    await expect(page.getByRole("status")).toContainText("Изменения сохранены");
    expect(state.writes).toEqual([{ path: setting.path, method: "POST", body: setting.payload }]);
    expect(state.records[setting.path]).toHaveLength(1);

    await page.reload();
    const disable = page.getByRole("checkbox", { name: `Выключить раздел «${setting.label}»` });
    await expect(disable).toBeChecked();
    await disable.uncheck();
    await save.click();
    await expect(page.getByRole("status")).toContainText("Изменения сохранены");
    await expect(enable()).not.toBeChecked();
    await expect(loadError).toBeHidden();
    expect(state.records[setting.path]).toHaveLength(0);
    expect(state.writes.map((write) => write.method)).toEqual(["POST", "DELETE"]);
    expect(emptyReads).toBeGreaterThan(1);
  });

  for (const failure of [401, 403, 404, 500, "network"] as const) {
    test(`${setting.tab}: ${failure} failure stays an error and can be retried`, async ({ page, baseURL }) => {
      test.setTimeout(45_000);
      const state = await setupSettingsAccount(page, baseURL);
      let failing = true;
      await page.route(`http://127.0.0.1:9${setting.path}`, (route) => {
        if (route.request().method() !== "GET" || !failing) return route.fallback();
        if (failure === "network") return route.abort("failed");
        return fulfillJson(route, {
          code: failure === 404 ? "ENDPOINT_NOT_FOUND" : setting.code,
          message: "Не удалось получить настройки",
          status: failure,
        }, failure);
      });

      await page.goto(`/dashboard/settings?tab=${setting.tab}`);
      const loadError = page.getByRole("alert").filter({ hasText: "Не удалось загрузить настройки" });
      await expect(loadError).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("checkbox")).toHaveCount(0);
      expect(state.writes).toHaveLength(0);

      failing = false;
      await page.getByRole("button", { name: "Повторить", exact: true }).click();
      await expect(loadError).toBeHidden();
      await expect(page.getByRole("checkbox", { name: `Выключить раздел «${setting.label}»` })).toBeChecked();
      expect(state.writes).toHaveLength(0);
    });
  }
}
