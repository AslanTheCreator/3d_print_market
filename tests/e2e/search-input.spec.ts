import { expect, test } from "@playwright/test";
import { adminProductFixture, setupAdmin } from "./helpers/admin";
import { mockGuestAuth } from "./helpers/guestAuth";
import { fulfillJson } from "./helpers/mobileAccount";

for (const width of [393, 1280]) {
  test(`${width}px admin search keeps rapid input during delayed navigation and preserves filters`, async ({ page, baseURL }) => {
    const state = await setupAdmin(page, baseURL);
    state.products = Array.from({ length: 45 }, (_, index) => adminProductFixture(101 + index));
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/admin/products?agent=2&status=ACTIVE&page=1");
    const input = page.getByRole("textbox", { name: "Поиск по названию или ID" });
    await expect(input).toBeVisible();
    const requests: Array<{ q: string | null; release: () => void }> = [];
    await page.route("**/admin/products?**", async route => {
      if (route.request().headers().rsc === "1") {
        await new Promise<void>(resolve => requests.push({
          q: new URL(route.request().url()).searchParams.get("q"), release: resolve,
        }));
      }
      await route.continue();
    });
    try {
      await input.pressSequentially("дракон", { delay: 10 });
      await expect(input).toHaveValue("дракон");
      await input.press("Enter");
      await expect.poll(() => requests.some(request => request.q === "дракон")).toBe(true);
      await input.pressSequentially(" 12", { delay: 10 });
      await expect(input).toHaveValue("дракон 12");
      await expect.poll(() => requests.some(request => request.q === "дракон 12")).toBe(true);
      requests.filter(request => request.q === "дракон").forEach(request => request.release());
      await expect(input).toHaveValue("дракон 12");
      requests.forEach(request => request.release());
      await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("дракон 12");
      await expect(input).toHaveValue("дракон 12");
      expect(new URL(page.url()).searchParams.get("agent")).toBe("2");
      expect(new URL(page.url()).searchParams.get("status")).toBe("ACTIVE");
      expect(new URL(page.url()).searchParams.get("page")).toBe("0");
      expect(state.writes).toEqual([]);
    } finally {
      requests.forEach(request => request.release());
      await page.unroute("**/admin/products?**");
    }
  });

  test(`${width}px admin Back/Forward restores draft and cancels pending debounce`, async ({ page, baseURL }) => {
    await setupAdmin(page, baseURL);
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/admin/products?agent=2&status=ACTIVE&q=101&page=0");
    const input = page.getByRole("textbox", { name: "Поиск по названию или ID" });
    await expect(input).toHaveValue("101");
    await page.evaluate(() => window.history.pushState(null, "", "/admin/products?agent=2&status=ACTIVE&q=дракон&page=0"));
    await expect(input).toHaveValue("дракон");
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await input.fill("несохранённый поиск");
    await page.goBack();
    await expect(input).toHaveValue("101");
    await page.clock.fastForward(1000);
    expect(new URL(page.url()).searchParams.get("q")).toBe("101");
    await page.goForward();
    await expect(input).toHaveValue("дракон");
    await input.fill("");
    await input.press("Enter");
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("");
    expect(new URL(page.url()).searchParams.get("agent")).toBe("2");
    expect(new URL(page.url()).searchParams.get("status")).toBe("ACTIVE");
  });

  for (const remaining of [0, 1]) {
    test(`${width}px header suggestions 3 → ${remaining} reset selection and Enter searches the typed query`, async ({ page }) => {
      await mockGuestAuth(page);
      let suggestions = ["dragon one", "dragon two", "dragon three"];
      let reads = 0;
      await page.route("**/products/names/find?**", route => {
        if (route.request().method() !== "OPTIONS") reads++;
        return fulfillJson(route, suggestions);
      });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: 850 });
      await page.goto("/catalog/search?query=dragon");
      if (width < 900) await page.getByRole("button", { name: "Открыть поиск", exact: true }).click();
      const input = page.getByRole("combobox", { name: "поиск по сайту" }).filter({ visible: true });
      await input.click();
      await expect(page.getByRole("option")).toHaveCount(3);
      for (let i = 0; i < 3; i++) await input.press("ArrowDown");
      await expect(page.getByRole("option").nth(2)).toHaveAttribute("aria-selected", "true");
      await page.clock.install();
      await page.clock.fastForward(5 * 60 * 1000 + 1);
      suggestions = remaining ? ["dragon refreshed"] : [];
      await page.evaluate(() => {
        window.dispatchEvent(new Event("offline"));
        window.dispatchEvent(new Event("online"));
      });
      await expect.poll(() => reads).toBe(2);
      await expect(page.getByRole("option")).toHaveCount(remaining);
      await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/);
      await input.press("Enter");
      await expect(page).toHaveURL(/\/catalog\/search\?query=dragon$/);
      if (width < 900) await expect(page.getByRole("dialog", { name: "Поиск", exact: true })).toBeHidden();
      expect(errors).toEqual([]);
    });
  }
}
