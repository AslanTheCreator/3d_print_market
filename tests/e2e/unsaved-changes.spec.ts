import { expect, test, type Page } from "@playwright/test";
import { fulfillJson, image, png, setupMobileAccount } from "./helpers/mobileAccount";
import { setupSettingsAccount } from "./helpers/settingsAccount";

test.setTimeout(60_000);
const file = { name: "photo.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") };
const detail = { id: 42, participantId: 1, name: "Исходный товар", description: "Описание", price: 1250, count: 2, prepaymentAmount: 0, currency: "RUB", originality: "ORIGINAL", availability: "PURCHASABLE", categories: [{ id: 2, name: "Аниме" }], imageIds: [77], reviews: [], status: "ACTIVE", externalUrl: null };

function watchDialogs(page: Page) {
  const state = { accept: false, calls: [] as { type: string; url: string }[] };
  page.on("dialog", async dialog => {
    state.calls.push({ type: dialog.type(), url: page.url() });
    if (state.accept) await dialog.accept(); else await dialog.dismiss();
  });
  return state;
}
const storage = (page: Page) => page.evaluate(() => JSON.stringify({
  local: { ...localStorage }, session: { ...sessionStorage }, history: history.state,
}));
const headerLeave = (page: Page) => page.getByTestId("site-header").getByRole("link", { name: "Избранное", exact: true });
async function editProfile(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Редактировать профиль", exact: true }).filter({ visible: true }).first().click();
  await expect(page.getByLabel("Имя и фамилия")).toBeVisible();
}

for (const mode of ["add", "edit"] as const) test(`address ${mode}: local cancel and header leave keep input until accepted`, async ({ page, baseURL }) => {
  await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/settings?tab=address");
  await page.getByRole("button", { name: mode === "add" ? "Добавить новый адрес" : /^Редактировать адрес:/ }).first().click();
  const dialogs = watchDialogs(page);
  const city = page.getByLabel("Город", { exact: true });
  const url = page.url();
  await city.fill("Несохранённый город");
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(city).toHaveValue("Несохранённый город");
  await expect(page).toHaveURL(url);
  expect(dialogs.calls).toHaveLength(1);
  await headerLeave(page).click();
  await expect(city).toHaveValue("Несохранённый город");
  await expect(page).toHaveURL(url);
  expect(dialogs.calls).toHaveLength(2);
  await page.reload({ timeout: 2000 }).catch(() => undefined);
  await expect(city).toHaveValue("Несохранённый город");
  await expect(page).toHaveURL(url);
  expect(dialogs.calls.at(-1)?.type).toBe("beforeunload");
  dialogs.accept = true;
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(city).toBeHidden();
  expect(dialogs.calls).toHaveLength(4);
  await headerLeave(page).click();
  await expect(page).toHaveURL(/\/favorites$/);
  expect(dialogs.calls).toHaveLength(4);
});

test("settings: browser Back/Forward restore URL before confirmation, keep drafts and permit one traversal", async ({ page, baseURL }) => {
  await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Доставка и оплата", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("tab", { name: /Способ оплаты/ }).click();
  await expect(page).toHaveURL(/tab=payment/);
  const recipient = page.getByRole("textbox", { name: "Имя получателя", exact: true });
  await recipient.fill("Секретный черновик реквизитов");
  await expect(page.getByRole("button", { name: "Сохранить", exact: true })).toBeEnabled();
  const url = page.url();
  const dialogs = watchDialogs(page);
  await page.evaluate(() => history.back());
  await expect.poll(() => dialogs.calls.length).toBe(1);
  await expect(page).toHaveURL(url);
  await expect(recipient).toHaveValue("Секретный черновик реквизитов");
  expect(dialogs.calls[0].url).toBe(url);
  // Создаём настоящую forward-запись клиентским переходом без потери формы.
  await page.getByRole("tab", { name: /Способы связи/ }).click();
  await expect(page).toHaveURL(/tab=contacts/);
  const contactsUrl = page.url();
  dialogs.accept = true;
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(dialogs.calls).toHaveLength(2);
  await page.evaluate(() => history.forward());
  await expect(page).toHaveURL(contactsUrl);
  await headerLeave(page).click();
  await expect(page).toHaveURL(/\/favorites$/);
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(contactsUrl);
  const contact = page.getByLabel("Имя пользователя", { exact: true }).first();
  await contact.fill("@forward-draft");
  // Forward к оставленной записи должен охраняться так же, как Back.
  dialogs.accept = false;
  const count = dialogs.calls.length;
  await page.evaluate(() => history.forward());
  await expect.poll(() => dialogs.calls.length).toBe(count + 1);
  await expect(page).toHaveURL(contactsUrl);
  await expect(contact).toHaveValue("@forward-draft");
  dialogs.accept = true;
  await page.evaluate(() => history.forward());
  await expect(page).toHaveURL(/\/favorites$/);
  expect(dialogs.calls).toHaveLength(count + 2);
});

for (const width of [393, 1280]) test(`profile ${width}px: image-only draft, local close, shell Link and reload`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width, height: 900 });
  await setupMobileAccount(page, baseURL);
  await editProfile(page);
  const dialogs = watchDialogs(page);
  await page.locator('input[type="file"]').setInputFiles(file);
  const photo = page.getByRole("img", { name: "Текущая фотография профиля", exact: true });
  await expect(photo).toBeVisible();
  const src = await photo.getAttribute("src");
  const url = page.url();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(photo).toHaveAttribute("src", src!);
  expect(dialogs.calls).toHaveLength(1);
  const leave = width < 900
    ? page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "Избранное", exact: true })
    : headerLeave(page);
  await leave.click();
  await expect(page).toHaveURL(url);
  await expect(photo).toHaveAttribute("src", src!);
  expect(dialogs.calls).toHaveLength(2);
  if (width < 900) {
    await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "Категории", exact: true }).click();
    await page.getByRole("button", { name: "Закрыть категории", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(photo).toHaveAttribute("src", src!);
    expect(dialogs.calls).toHaveLength(2);
  }
  await page.reload({ timeout: 2000 }).catch(() => undefined);
  await expect(photo).toHaveAttribute("src", src!);
  await expect(page).toHaveURL(url);
  expect(dialogs.calls.at(-1)?.type).toBe("beforeunload");
  dialogs.accept = true;
  await leave.click();
  await expect(page).toHaveURL(/\/favorites$/);
  expect(dialogs.calls).toHaveLength(4);
});

test("profile: pending upload/save blocks local and shell exits; success has no warning", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  let releaseUpload!: () => void, releaseSave!: () => void;
  const uploadGate = new Promise<void>(resolve => { releaseUpload = resolve; });
  const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
  let writes = 0;
  await page.route("**/images?tag=PARTICIPANT", async route => { await uploadGate; return fulfillJson(route, [81]); });
  await page.route("**/participant", async route => {
    if (route.request().method() !== "PUT") return route.fallback();
    writes++; await saveGate; return fulfillJson(route, null);
  });
  await editProfile(page);
  const dialogs = watchDialogs(page);
  await page.locator('input[type="file"]').setInputFiles(file);
  try {
    await expect(page.getByRole("button", { name: "Загружаем фото..." })).toBeDisabled();
    await page.getByRole("button", { name: "Назад", exact: true }).click();
    await headerLeave(page).click();
    await expect(page.getByLabel("Имя и фамилия")).toBeVisible();
    expect(dialogs.calls).toHaveLength(0);
  } finally { releaseUpload(); }
  const save = page.getByRole("button", { name: "Сохранить изменения", exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  try {
    await expect.poll(() => writes).toBe(1);
    await page.getByRole("button", { name: "Назад", exact: true }).click();
    await headerLeave(page).click();
    await expect(page.getByLabel("Имя и фамилия")).toBeVisible();
    expect(dialogs.calls).toHaveLength(0);
  } finally { releaseSave(); }
  await expect(page.getByTestId("profile-overview")).toBeVisible();
  await headerLeave(page).click();
  await expect(page).toHaveURL(/\/favorites$/);
  expect(dialogs.calls).toHaveLength(0);
});

for (const imagesOnly of [false, true]) test(`product edit: ${imagesOnly ? "image" : "field"} dirty protects mobile Back and history; saved baseline is clean`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 393, height: 900 });
  await setupMobileAccount(page, baseURL);
  let writes = 0;
  await page.route("**/product/42", route => {
    if (route.request().method() === "PUT") { writes++; return fulfillJson(route, null); }
    return fulfillJson(route, detail);
  });
  await page.route("**/images/metadata?*", route => fulfillJson(route, [image]));
  await page.route("**/products/my", route => fulfillJson(route, [{ ...detail, imageId: 77, sellerId: 1, sellerLogin: "mobile-user", sellerRating: 5, totalReviews: 1, expirationDate: "2030-01-01T00:00:00Z", createdAt: "2026-07-01T00:00:00Z" }]));
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Мои товары", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("link", { name: `Редактировать товар ${detail.name}` }).click();
  const name = page.getByRole("textbox", { name: "Название товара" });
  await expect(name).toHaveValue(detail.name, { timeout: 15_000 });
  const dialogs = watchDialogs(page);
  if (imagesOnly) await page.getByRole("button", { name: "Удалить изображение 1", exact: true }).click();
  else await name.fill("Правка товара");
  const url = page.url();
  await page.getByTestId("site-header").getByRole("button", { name: /Назад/ }).click();
  await expect.poll(() => dialogs.calls.length).toBe(1);
  await expect(page).toHaveURL(url);
  await expect(name).toHaveValue(imagesOnly ? detail.name : "Правка товара");
  await page.reload({ timeout: 2000 }).catch(() => undefined);
  await expect(name).toHaveValue(imagesOnly ? detail.name : "Правка товара");
  await expect(page).toHaveURL(url);
  expect(dialogs.calls.at(-1)?.type).toBe("beforeunload");
  if (imagesOnly) {
    dialogs.accept = true;
    await page.evaluate(() => history.back());
    await expect(page).toHaveURL(/\/dashboard\/products$/);
    expect(dialogs.calls).toHaveLength(3);
  } else {
    await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/products$/);
    expect(writes).toBe(1);
    expect(dialogs.calls).toHaveLength(2);
  }
});

test("sensitive settings/password input stays in memory; accepted reload discards it", async ({ page, baseURL }) => {
  await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/settings?tab=payment");
  await page.getByRole("textbox", { name: "Имя получателя", exact: true }).fill("private-recipient-marker");
  await page.getByLabel("Номер карты", { exact: true }).fill("private-card-marker");
  expect(await storage(page)).not.toContain("private-recipient-marker");
  expect(await storage(page)).not.toContain("private-card-marker");
  const dialogs = watchDialogs(page);
  dialogs.accept = true;
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Имя получателя", exact: true })).toHaveValue("Получатель");
  expect(dialogs.calls).toHaveLength(1);
  await page.goto("/dashboard/security");
  const password = page.getByLabel("Текущий пароль", { exact: true });
  await password.fill("private-password-marker");
  expect(await storage(page)).not.toContain("private-password-marker");
  dialogs.accept = false;
  await headerLeave(page).click();
  await expect(password).toHaveValue("private-password-marker");
  dialogs.accept = true;
  await page.reload();
  await expect(password).toHaveValue("");
  expect(dialogs.calls).toHaveLength(3);
});

test("settings: programmatic header search requires one confirmation", async ({ page, baseURL }) => {
  await setupSettingsAccount(page, baseURL);
  await page.goto("/dashboard/settings?tab=payment");
  const recipient = page.getByRole("textbox", { name: "Имя получателя", exact: true });
  await recipient.fill("Несохранённый получатель");
  const dialogs = watchDialogs(page);
  const url = page.url();
  const search = page.getByRole("combobox", { name: "поиск по сайту" });
  await search.fill("Фигурка");
  await search.press("Enter");
  await expect(recipient).toHaveValue("Несохранённый получатель");
  await expect(page).toHaveURL(url);
  expect(dialogs.calls).toHaveLength(1);
  dialogs.accept = true;
  await search.press("Enter");
  await expect(page).toHaveURL(/\/catalog\/search\?query=/);
  expect(dialogs.calls).toHaveLength(2);
});

for (const address of [false, true]) test(`${address ? "address" : "settings"}: pending exits are blocked; confirmed save clears the guard`, async ({ page, baseURL }) => {
  const state = await setupSettingsAccount(page, baseURL);
  let release!: () => void;
  state.writeGate = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Доставка и оплата", exact: true }).filter({ visible: true }).first().click();
  if (address) {
    await page.getByRole("button", { name: /^Редактировать адрес:/ }).click();
    await page.getByLabel("Город", { exact: true }).fill("Казань");
  } else {
    await page.getByRole("tab", { name: "Способ отправки", exact: true }).click();
    await expect(page).toHaveURL(/tab=shipping/);
    await page.getByRole("textbox", { name: "Стоимость доставки" }).fill("650.25");
  }
  const dialogs = watchDialogs(page);
  const url = page.url();
  await page.getByRole("button", { name: address ? "Сохранить изменения" : "Сохранить", exact: true }).click();
  try {
    await expect.poll(() => state.writes.length).toBe(1);
    await headerLeave(page).click();
    await page.evaluate(() => history.back());
    // Даём асинхронному обходу истории завершить возврат на исходную запись.
    await page.waitForTimeout(250);
    await expect(page).toHaveURL(url);
    if (address) {
      await expect(page.getByLabel("Город", { exact: true })).toHaveValue("Казань");
      await expect(page.getByRole("button", { name: "Отмена", exact: true })).toBeDisabled();
    } else await expect(page.getByRole("textbox", { name: "Стоимость доставки" })).toHaveValue("650.25");
    expect(dialogs.calls).toHaveLength(0);
  } finally { release(); }
  if (address) await expect(page.getByLabel("Город", { exact: true })).toBeHidden();
  else await expect(page.getByRole("status")).toContainText("Изменения сохранены");
  await headerLeave(page).click();
  await expect(page).toHaveURL(/\/favorites$/);
  expect(dialogs.calls).toHaveLength(0);
});
