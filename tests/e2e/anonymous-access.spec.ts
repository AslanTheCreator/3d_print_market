import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/checkout", "/favorites"];

const protectedRoutes = [
  "/dashboard/products",
  "/dashboard/products/new",
  "/dashboard/sales",
];

test.describe("anonymous access", () => {
  for (const route of publicRoutes) {
    test(`renders ${route}`, async ({ page }) => {
      const response = await page.goto(route);

      expect(response?.ok()).toBe(true);
      await expect(page.locator("body")).toBeVisible();

      const bodyText = await page.locator("body").innerText();
      expect(bodyText.trim().length).toBeGreaterThan(0);
    });
  }

  for (const route of protectedRoutes) {
    test(`redirects ${route} to login`, async ({ page }) => {
      await page.goto(route);

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
