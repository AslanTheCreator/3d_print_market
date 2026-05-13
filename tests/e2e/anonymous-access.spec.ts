import { expect, type Page, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/checkout",
  "/favorites",
  "/catalog/category/32-test",
  "/catalog/1/detail",
];

const protectedRoutes = [
  "/dashboard",
  "/dashboard/products",
  "/dashboard/products/new",
  "/dashboard/products/1/edit",
  "/dashboard/purchase",
  "/dashboard/sales",
  "/dashboard/settings",
  "/dashboard/security",
];

const gotoDomReady = (page: Page, route: string) =>
  page.goto(route, { waitUntil: "domcontentloaded" });

test.describe("anonymous access", () => {
  for (const route of publicRoutes) {
    test(`renders ${route}`, async ({ page }) => {
      const response = await gotoDomReady(page, route);

      expect(response?.ok()).toBe(true);
      await expect(page.locator("body")).toBeVisible();

      const bodyText = await page.locator("body").innerText();
      expect(bodyText.trim().length).toBeGreaterThan(0);
    });
  }

  test("shows unauthorized state on checkout without changing public route", async ({
    page,
  }) => {
    await gotoDomReady(page, "/checkout");

    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId("unauthorized-state-checkout")).toBeVisible();
  });

  test("shows unauthorized state on favorites without changing public route", async ({
    page,
  }) => {
    await gotoDomReady(page, "/favorites");

    await expect(page).toHaveURL(/\/favorites/);
    await expect(page.getByTestId("unauthorized-state-favorites")).toBeVisible();
  });

  for (const route of protectedRoutes) {
    test(`redirects ${route} to login`, async ({ page }) => {
      await gotoDomReady(page, route);

      await expect(page).toHaveURL(/\/auth\/login/);
      expect(page.url()).toContain("redirect=");
    });
  }

  test("exposes browser runtime config", async ({ request }) => {
    const response = await request.get("/api/config");
    const config = await response.json();

    expect(response.ok()).toBe(true);
    expect(typeof config.apiUrl).toBe("string");
    expect(config.apiUrl.length).toBeGreaterThan(0);
  });
});
