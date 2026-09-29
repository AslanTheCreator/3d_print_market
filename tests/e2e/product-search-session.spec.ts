import { expect, type Page, type Route, test } from "@playwright/test";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-refresh-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const fulfill = (route: Route, body: unknown) => route.fulfill({
  status: route.request().method() === "OPTIONS" ? 204 : 200,
  headers, contentType: "application/json",
  body: route.request().method() === "OPTIONS" ? "" : JSON.stringify(body),
});

const regularProduct = {
  id: 801, name: "Общая фигурка", count: 5, price: 1000, prepaymentAmount: 0,
  currency: "RUB", categories: [], imageId: 0, sellerId: 42,
  expirationDate: "2030-01-01T00:00:00Z", status: "ACTIVE", availability: "PURCHASABLE",
  externalUrl: null, sellerLogin: "seller", sellerRating: 5, totalReviews: 1,
  createdAt: "2026-09-27T00:00:00Z",
};
const adultProduct = { ...regularProduct, id: 802, name: "Фигурка только для взрослых", categories: [{ id: 131, name: "18+" }] };

const mockSearch = async (page: Page) => {
  const requests: Array<{ authorization?: string; body: Record<string, unknown> }> = [];
  const profile = {
    id: 99, fullName: "Покупатель", login: "buyer", role: "USER",
    email: "buyer@example.com", mail: "buyer@example.com", imageId: null,
    exp: 0, type: "access", addresses: [], accounts: [], transfers: [], socialNetworks: [],
    phoneNumber: "", status: "ACTIVE", sellerStatus: "DEFAULT", averageRating: 0, totalReviews: 0,
  };
  await page.route("**/auth/profile", (route) => fulfill(route, profile));
  await page.route("**/participant", (route) => fulfill(route, profile));
  for (const path of ["basket/find", "favorites/find", "products/my", "order/customer", "order/seller", "products/names/find"]) {
    await page.route("**/" + path, (route) => fulfill(route, []));
  }
  await page.route("**/auth/login", (route) => {
    const mail = route.request().method() === "OPTIONS" ? "" : route.request().postDataJSON().mail;
    return fulfill(route, { access_token: mail.startsWith("minor") ? "minor-token" : "adult-token" });
  });
  await page.route("**/products/find", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") { await fulfill(route, null); return; }
    const authorization = request.headers().authorization;
    const body = request.postDataJSON();
    expect(body).not.toHaveProperty("includeAdult");
    requests.push({ authorization, body });
    await fulfill(route, authorization === "Bearer adult-token" ? [regularProduct, adultProduct] : [regularProduct]);
  });
  return requests;
};

for (const token of [undefined, "minor-token", "adult-token", "invalid-token"]) {
  test("search forwards optional authorization: " + (token ?? "guest"), async ({ context, page, baseURL }) => {
    if (token) await context.addCookies([{ name: "access_token", value: token, url: baseURL! }]);
    const requests = await mockSearch(page);
    await page.goto("/catalog/search?query=figurine");
    await expect(page.getByText("Общая фигурка", { exact: true })).toBeVisible();
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(requests.every((request) => request.authorization === (token ? "Bearer " + token : undefined))).toBe(true);
    await expect(page.getByText(adultProduct.name, { exact: true })).toHaveCount(token === "adult-token" ? 1 : 0);
    await expect(page).toHaveURL(/catalog\/search/);
  });
}

test("login refreshes cached guest search and a later account cannot see adult results", async ({ page }) => {
  await mockSearch(page);
  await page.goto("/catalog/search?query=figurine");
  await expect(page.getByText(regularProduct.name, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Купить", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Войти", exact: true }).click();
  await page.getByLabel(/^Email/).fill("adult@example.com");
  await page.getByLabel(/^Пароль/).fill("test-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/catalog\/search/);
  await expect(page.getByText(adultProduct.name, { exact: true })).toBeVisible();

  await page.getByRole("navigation", { name: "Действия в шапке сайта" }).getByRole("link", { name: "Профиль", exact: true }).click();
  await page.getByRole("button", { name: "Выход", exact: true }).click();
  await expect(page).toHaveURL(/auth\/login/);
  await page.getByLabel(/^Email/).fill("minor@example.com");
  await page.getByLabel(/^Пароль/).fill("test-password");
  const returnPath = new URL(page.url()).searchParams.get("redirect") ?? "/";
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(new URL(returnPath, page.url()).toString());
  const search = page.getByRole("combobox", { name: "поиск по сайту" });
  await search.fill("figurine");
  await search.press("Enter");
  await expect(page).toHaveURL(/catalog\/search/);
  await expect(page.getByText(regularProduct.name, { exact: true })).toBeVisible();
  await expect(page.getByText(adultProduct.name, { exact: true })).toHaveCount(0);
});
