import { expect, test, type Page } from "@playwright/test";

const readStyles = (page: Page) => page.getByRole("banner").evaluate(banner => {
  const style = getComputedStyle(banner);
  return {
    background: style.backgroundColor,
    radius: style.borderRadius,
    font: getComputedStyle(document.body).fontFamily,
    weight: style.fontWeight,
  };
});

for (const width of [1280, 393]) {
  test(`MUI SSR CSS survives hydration at ${width}px`, async ({ browser, page, baseURL }) => {
    const viewport = { width, height: 900 };
    const serverContext = await browser.newContext({ baseURL, viewport, javaScriptEnabled: false });
    try {
      const serverPage = await serverContext.newPage();
      await serverPage.route("https://mc.yandex.ru/**", route => route.abort());
      const response = await serverPage.goto("/about", { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      const html = await response!.text();
      expect(html).toContain("@layer mui");
      expect(await serverPage.locator('head style[data-emotion^="mui"]').count()).toBeGreaterThan(0);
      const serverStyles = await readStyles(serverPage);
      expect(serverStyles.background).not.toBe("rgba(0, 0, 0, 0)");
      expect(serverStyles.font).toMatch(/montserrat/i);

      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => {
        if (/hydration|hydrating|did not match|server rendered/i.test(message.text())) errors.push(message.text());
      });
      await page.setViewportSize(viewport);
      await page.route("https://mc.yandex.ru/**", route => route.abort());
      await page.goto("/about");
      await expect.poll(() => readStyles(page)).toEqual(serverStyles);
      await page.goto("/auth/login");
      await page.getByLabel(/^Email/).fill("mui@example.test");
      await expect(page.getByLabel(/^Email/)).toHaveValue("mui@example.test");
      await expect(page.getByLabel(/^Пароль/)).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      await serverContext.close();
    }
  });
}
