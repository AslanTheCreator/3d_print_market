import { expect, test, type Page } from "@playwright/test";
import { fulfillJson, image, png, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);
const upload = (name = "avatar.png", mimeType = "image/png") => ({ name, mimeType, buffer: Buffer.from(png, "base64") });
const preview = (page: Page) => page.getByRole("img", { name: "Текущая фотография профиля", exact: true });
const save = (page: Page) => page.getByRole("button", { name: "Сохранить изменения", exact: true });

async function setup(page: Page, baseURL?: string) {
  await setupMobileAccount(page, baseURL);
  const state = { uploadStatus: 200, uploadResponse: [81] as unknown, putStatus: 200, uploads: 0, writes: [] as Record<string, unknown>[], deletes: [] as string[][],
    user: { id: 1, login: "mobile-user", fullName: "Исходное имя", mail: "user@example.com", phoneNumber: "", imageId: 77, status: "ACTIVE", sellerStatus: "DEFAULT", accounts: [], transfers: [], socialNetworks: [], addresses: [] } };
  await page.route("**/participant", route => {
    if (route.request().method() === "PUT") {
      const payload = route.request().postDataJSON();
      state.writes.push(payload);
      if (state.putStatus === 200) state.user = { ...state.user, ...payload };
      return fulfillJson(route, 1, state.putStatus);
    }
    return fulfillJson(route, state.user);
  });
  await page.route("**/images/metadata?*", route => {
    const ids = new URL(route.request().url()).searchParams.get("ids")!.split(",").map(Number);
    return fulfillJson(route, ids.map(id => ({ ...image, id })));
  });
  await page.route("**/images?*", route => {
    if (route.request().method() === "POST") {
      state.uploads++;
      return fulfillJson(route, state.uploadResponse, state.uploadStatus);
    }
    if (route.request().method() === "DELETE") state.deletes.push(new URL(route.request().url()).searchParams.getAll("ids"));
    return fulfillJson(route, null);
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Редактировать профиль", exact: true }).first().click();
  await expect(preview(page)).toHaveAttribute("src", image.mediumUrl);
  return state;
}

test("A success then B failure preserves preview/ID through profile save error and retry", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  await page.locator('input[type="file"]').setInputFiles(upload("A.png"));
  await expect(save(page)).toBeEnabled();
  const confirmed = await preview(page).getAttribute("src");
  expect(confirmed).toMatch(/^blob:/);
  state.uploadStatus = 500;
  await page.locator('input[type="file"]').setInputFiles(upload("B.png"));
  await expect(page.getByText("Не удалось загрузить изображение на сервер", { exact: true })).toBeVisible();
  await expect(preview(page)).toHaveAttribute("src", confirmed!);
  state.putStatus = 500;
  await save(page).click();
  await expect(save(page)).toBeEnabled();
  await expect(preview(page)).toHaveAttribute("src", confirmed!);
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].imageId).toBe(81);
  expect(state.deletes).toEqual([]);
  state.putStatus = 200;
  await save(page).click();
  await expect(page.getByTestId("profile-overview")).toBeVisible();
  expect(state.writes.map(value => value.imageId)).toEqual([81, 81]);
  expect(state.deletes).toEqual([]);
});

for (const invalid of ["file", "response"] as const) test(`invalid ${invalid} keeps existing avatar and never DELETEs it`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  if (invalid === "response") state.uploadResponse = [];
  await page.locator('input[type="file"]').setInputFiles(upload("invalid.gif", invalid === "file" ? "image/gif" : "image/png"));
  await expect(page.getByRole("alert").filter({ hasText: invalid === "file" ? "Поддерживаются только файлы" : "Не удалось загрузить изображение" })).toBeVisible();
  await expect(preview(page)).toHaveAttribute("src", image.mediumUrl);
  await expect(save(page)).toBeDisabled();
  await page.getByRole("textbox", { name: "Логин", exact: true }).fill("updated-profile");
  await save(page).click();
  await expect(page.getByTestId("profile-overview")).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.deletes).toEqual([]);
  expect(state.uploads).toBe(invalid === "file" ? 0 : 1);
});

test("pending upload blocks programmatic submit and Back; confirmed discard resets the editor", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  let release!: () => void;
  const gate = new Promise<void>(done => { release = done; });
  await page.route("**/images?*", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    await gate;
    return fulfillJson(route, [81]);
  });
  try {
    await page.locator('input[type="file"]').setInputFiles(upload());
    await expect(page.getByRole("button", { name: "Загружаем фото...", exact: true })).toBeDisabled();
    await expect(preview(page)).toHaveAttribute("src", image.mediumUrl);
    await page.locator("form").filter({ has: page.getByRole("textbox", { name: "Логин", exact: true }) })
      .evaluate(form => (form as HTMLFormElement).requestSubmit());
    await page.getByRole("button", { name: "Назад", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Редактирование профиля", exact: true })).toBeVisible();
    await expect(preview(page)).toHaveAttribute("src", image.mediumUrl);
    expect(state.writes).toEqual([]);
    const response = page.waitForResponse(value => value.request().method() === "POST" && value.url().includes("/images?"));
    release(); await response;
    await expect(preview(page)).toHaveAttribute("src", /^blob:/);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Назад", exact: true }).click();
    await page.getByRole("button", { name: "Редактировать профиль", exact: true }).first().click();
    await expect(preview(page)).toHaveAttribute("src", image.mediumUrl);
    await expect(save(page)).toBeDisabled();
    expect(state.writes).toEqual([]);
    expect(state.deletes).toEqual([]);
  } finally { release(); }
});

test("explicit removal after failed replacement alone deletes the original avatar", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  state.uploadStatus = 500;
  await page.locator('input[type="file"]').setInputFiles(upload());
  await expect(page.getByText("Не удалось загрузить изображение на сервер", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Удалить фотографию профиля", exact: true }).click();
  await expect(preview(page)).toHaveCount(0);
  await save(page).click();
  await expect(page.getByTestId("profile-overview")).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].imageId).toBeNull();
  expect(state.deletes).toEqual([["77"]]);
});

test("failed upload can be retried with a valid file and saves its new ID", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  state.uploadStatus = 500;
  await page.locator('input[type="file"]').setInputFiles(upload());
  await expect(page.getByText("Не удалось загрузить изображение на сервер", { exact: true })).toBeVisible();
  await expect(preview(page)).toHaveAttribute("src", image.mediumUrl);
  state.uploadStatus = 200;
  state.uploadResponse = [82];
  await page.locator('input[type="file"]').setInputFiles(upload());
  await expect(save(page)).toBeEnabled();
  await expect(preview(page)).toHaveAttribute("src", /^blob:/);
  await expect(page.getByText("Не удалось загрузить изображение на сервер", { exact: true })).toHaveCount(0);
  await save(page).click();
  await expect(page.getByTestId("profile-overview")).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].imageId).toBe(82);
  expect(state.deletes).toEqual([]);
  expect(state.uploads).toBe(2);
});
