import { expect, test } from "@playwright/test";
import { fulfillJson, image, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);
const detail = { id: 42, participantId: 1, name: "Исходный товар", description: "Описание", price: 1250, count: 2, prepaymentAmount: 0, currency: "RUB", originality: "ORIGINAL", availability: "PURCHASABLE", categories: [{ id: 2, name: "Аниме" }], imageIds: [11, 22, 33], reviews: [], status: "ACTIVE", externalUrl: null };

for (const putFails of [false, true]) {
  test(`product ${putFails ? "PUT failure keeps input and never cleans up" : "PUT success and partial cleanup failure retries DELETE only"}`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    let putStatus = putFails ? 500 : 200, cleanupFails = true;
    let saved = { ...detail };
    const puts: Record<string, unknown>[] = [], deletes: string[][] = [];
    await page.route("**/product/42", route => {
      if (route.request().method() === "PUT") {
        const payload = route.request().postDataJSON();
        puts.push(payload);
        if (putStatus === 200) saved = { ...saved, ...payload };
        return fulfillJson(route, null, putStatus);
      }
      return fulfillJson(route, saved);
    });
    await page.route("**/images/metadata?*", route => fulfillJson(route, [11, 22, 33].map(id => ({ ...image, id }))));
    await page.route("**/images?*", route => {
      const ids = new URL(route.request().url()).searchParams.getAll("ids");
      deletes.push(ids);
      return fulfillJson(route, null, cleanupFails && ids.includes("22") ? 500 : 200);
    });
    await page.goto("/dashboard/products/42/edit");
    await page.getByRole("textbox", { name: "Название товара" }).fill("Подтверждённый товар");
    await page.getByRole("button", { name: "Удалить изображение 1", exact: true }).click();
    await page.getByRole("button", { name: "Удалить изображение 1", exact: true }).click();
    await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
    if (putFails) {
      await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeEnabled();
      await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("Подтверждённый товар");
      expect(deletes).toEqual([]);
      await expect(page.getByText("Товар сохранён, очистка изображений не завершена.")).toHaveCount(0);
      putStatus = 200;
      cleanupFails = false;
      await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
    } else {
      await expect(page.getByText("Товар сохранён, очистка изображений не завершена.")).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Название товара" })).toHaveValue("Подтверждённый товар");
      await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeDisabled();
      expect(saved.imageIds).toEqual([33]);
      expect(deletes).toEqual([["11"], ["22"]]);
      cleanupFails = false;
      await page.getByRole("button", { name: "Повторить очистку", exact: true }).click();
    }
    await expect(page).toHaveURL(/\/dashboard\/products$/);
    expect(puts).toHaveLength(putFails ? 2 : 1);
    expect(deletes).toEqual(putFails ? [["11"], ["22"]] : [["11"], ["22"], ["22"]]);
  });
}

for (const putFails of [false, true]) {
  test(`profile ${putFails ? "PUT failure keeps input and avatar" : "saved profile survives cleanup failure and retries without PUT"}`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    let putStatus = putFails ? 500 : 200, cleanupFails = true;
    let user = { id: 1, login: "mobile-user", fullName: "Исходное имя", mail: "user@example.com", phoneNumber: "", imageId: 77 as number | null, status: "ACTIVE", sellerStatus: "DEFAULT", accounts: [], transfers: [], socialNetworks: [], addresses: [] };
    const puts: Record<string, unknown>[] = [], deletes: string[][] = [];
    await page.route("**/participant", route => {
      if (route.request().method() === "PUT") {
        const payload = route.request().postDataJSON();
        puts.push(payload);
        if (putStatus === 200) user = { ...user, ...payload };
        return fulfillJson(route, 1, putStatus);
      }
      return fulfillJson(route, user);
    });
    await page.route("**/images?*", route => {
      deletes.push(new URL(route.request().url()).searchParams.getAll("ids"));
      return fulfillJson(route, null, cleanupFails ? 500 : 200);
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Редактировать профиль", exact: true }).first().click();
    await page.getByRole("textbox", { name: "Логин", exact: true }).fill("saved-profile");
    await page.getByRole("button", { name: "Удалить фотографию профиля", exact: true }).click();
    await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
    if (putFails) {
      await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeEnabled();
      await expect(page.getByRole("textbox", { name: "Логин", exact: true })).toHaveValue("saved-profile");
      expect(user.imageId).toBe(77);
      expect(deletes).toEqual([]);
      putStatus = 200;
      cleanupFails = false;
      await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
    } else {
      await expect(page.getByText("Профиль сохранён, очистка изображений не завершена.")).toBeVisible();
      await expect(page.getByText("Изменения сохранены.", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeDisabled();
      expect(user.login).toBe("saved-profile");
      expect(user.imageId).toBeNull();
      cleanupFails = false;
      await page.getByRole("button", { name: "Повторить очистку", exact: true }).click();
    }
    await expect(page.getByTestId("profile-overview").getByRole("heading", { name: "saved-profile", exact: true })).toBeVisible();
    expect(puts).toHaveLength(putFails ? 2 : 1);
    expect(deletes).toEqual(putFails ? [["77"]] : [["77"], ["77"]]);
    await expect(page.getByTestId("profile-overview").getByRole("img", { name: "saved-profile", exact: true })).toHaveCount(0);
  });
}

for (const action of ["delete", "extend"] as const) {
  test(`return to cached catalog after ${action} reads confirmed products`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    let changed = false, catalogReads = 0;
    const product = { ...detail, imageId: 0, sellerId: 1, sellerLogin: "mobile-user", sellerRating: 5, totalReviews: 1, createdAt: "2026-07-01T00:00:00Z", expirationDate: "2020-01-01T00:00:00Z" };
    await page.route("**/products/find", route => {
      catalogReads++;
      return fulfillJson(route, changed ? (action === "delete" ? [] : [{ ...product, name: "Продлённый товар" }]) : [product]);
    });
    await page.route("**/products/my", route => fulfillJson(route, changed && action === "delete" ? [] : [product]));
    await page.route(action === "delete" ? "**/product/42" : "**/products/extend/42", route => {
      changed = true;
      return fulfillJson(route, null);
    });
    await page.goto("/");
    await expect(page.getByText(product.name, { exact: true })).toBeVisible();
    const readsBefore = catalogReads;
    await page.getByRole("link", { name: "Профиль", exact: true }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("button", { name: "Редактировать профиль", exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Мои товары", exact: true }).first().click();
    if (action === "delete") {
      await page.getByRole("button", { name: `Действия с товаром ${product.name}` }).click();
      await page.getByRole("menuitem", { name: "Удалить", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Удалить", exact: true }).click();
      await expect(page.getByText("Товар успешно удалён", { exact: true })).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Продлить", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Продлить", exact: true }).click();
      await expect(page.getByText("Срок действия товара продлён на 30 дней", { exact: true })).toBeVisible();
    }
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => catalogReads).toBeGreaterThan(readsBefore);
    await expect(page.getByText(product.name, { exact: true })).toHaveCount(0);
    if (action === "extend") await expect(page.getByText("Продлённый товар", { exact: true })).toBeVisible();
  });
}
