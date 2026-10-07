import { expect, test, type Locator } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { mockGuestAuth } from "./helpers/guestAuth";
import { fulfillJson, orderFixture } from "./helpers/mobileAccount";

test.setTimeout(90_000);

const expectDecodedImage = async (image: Locator) => {
  await expect.poll(() => image.evaluate(async element => {
    const img = element as HTMLImageElement;
    try {
      await img.decode();
      return img.complete && img.naturalWidth > 0 && Boolean(img.currentSrc);
    } catch {
      // A React update may replace src while decode is pending; await the final image.
      return false;
    }
  })).toBe(true);
};

for (const dpr of [1, 2]) {
  for (const width of [393, 600, 723, 724, 891, 892, 899, 900, 1093, 1094, 1303, 1304, 1376, 1504, 1700]) {
    test(`${width}px DPR ${dpr}: card source matches the rendered grid`, async ({ browser, baseURL }, testInfo) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr });
      const page = await context.newPage();
      try {
        await mockGuestAuth(page);
        const product = { ...orderFixture(1, "BOOKED", 1).product, imageId: 9011, name: "Размер изображения" };
        await page.route("**/products/find", route => fulfillJson(route, [product]));
        const imageUrl = "/__playwright-image-sizing.png";
        await page.route("**/images/metadata?ids=*", route => fulfillJson(route, [{
          id: 9011, originalUrl: imageUrl, mediumUrl: imageUrl, thumbnailUrl: imageUrl,
          width: 1200, height: 1200, contentType: "image/png",
        }]));
        const errors: string[] = [];
        const requestedUrls: string[] = [];
        page.on("request", request => requestedUrls.push(decodeURIComponent(request.url())));
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => {
          if (/hydration|did not match|server rendered html/i.test(message.text())) errors.push(message.text());
        });
        await page.goto(`${baseURL}/catalog/search?query=sizing`);
        const image = page.locator("img.product-card-image");
        await expect(image).toBeVisible();
        await page.evaluate(async () => { await document.fonts.ready; });
        await expectDecodedImage(image);
        const readMetrics = () => image.evaluate(element => {
          const img = element as HTMLImageElement;
          const currentSrc = img.currentSrc;
          if (!img.complete || img.naturalWidth === 0 || !currentSrc) return null;
          const transfer = performance.getEntriesByName(currentSrc).at(-1) as PerformanceResourceTiming | undefined;
          const sizes = img.sizes.split(/,\s*/);
          const declaredSize = sizes.find(size => {
            const condition = size.match(/^\([^)]+\)/)?.[0];
            return !condition || matchMedia(condition).matches;
          })!.replace(/^\([^)]+\)\s*/, "");
          const probe = document.createElement("div");
          probe.style.width = declaredSize;
          document.body.append(probe);
          const declaredWidth = probe.getBoundingClientRect().width;
          probe.remove();
          return {
            clientWidth: img.clientWidth, renderedWidth: img.getBoundingClientRect().width,
            declaredWidth, currentSrc, selectedWidth: Number(new URL(currentSrc).searchParams.get("w")),
            transferSize: transfer?.transferSize, encodedBodySize: transfer?.encodedBodySize,
          };
        });
        const snapshot: { value: Awaited<ReturnType<typeof readMetrics>> } = { value: null };
        await expect.poll(async () => {
          snapshot.value = await readMetrics();
          return snapshot.value !== null;
        }).toBe(true);
        const metrics = snapshot.value;
        if (!metrics) throw new Error("No decoded image metrics");
        const metricsPath = testInfo.outputPath("image-sizing.json");
        await writeFile(metricsPath, JSON.stringify({ width, dpr, ...metrics }, null, 2));
        await testInfo.attach("image-sizing.json", { path: metricsPath, contentType: "application/json" });
        expect(metrics.transferSize).toBeGreaterThan(0);
        expect(metrics.encodedBodySize).toBeGreaterThan(0);
        expect(metrics.selectedWidth).toBeGreaterThanOrEqual(metrics.renderedWidth * dpr);
        expect(Math.abs(metrics.declaredWidth - metrics.renderedWidth)).toBeLessThanOrEqual(1);
        const candidates = (await image.getAttribute("srcset"))!.split(",").map(src => Number(src.trim().split(/\s+/).at(-1)!.replace("w", "")));
        const expectedWidth = candidates.find(candidate => candidate >= metrics.renderedWidth * dpr)!;
        expect(metrics.selectedWidth).toBe(expectedWidth);
        expect(requestedUrls.some(url => url.includes(width < 900 ? "logo-desktop" : "logo-mobile"))).toBe(false);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
}

for (const dpr of [1, 2]) {
  test(`compact logo preserves the original mark at ${44 * dpr}px`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 600, height: 900 }, deviceScaleFactor: dpr });
    const page = await context.newPage();
    try {
      await mockGuestAuth(page);
      const requestedUrls: string[] = [];
      page.on("request", request => requestedUrls.push(decodeURIComponent(request.url())));
      await page.goto(`${baseURL}/favorites`);
      const image = page.getByRole("link", { name: "Figurzilla — главная страница" }).locator("img");
      await expectDecodedImage(image);
      const metrics = await image.evaluate(element => {
        const img = element as HTMLImageElement;
        const resource = performance.getEntriesByName(img.currentSrc).at(-1) as PerformanceResourceTiming;
        return { clientWidth: img.clientWidth, clientHeight: img.clientHeight, currentSrc: img.currentSrc, transferSize: resource.transferSize };
      });
      expect(metrics.clientWidth).toBe(44);
      expect(metrics.clientHeight).toBe(44);
      expect(metrics.transferSize).toBeGreaterThan(0);
      expect(metrics.transferSize).toBeLessThan(15_000);
      expect(requestedUrls.some(url => url.includes("logo-desktop"))).toBe(false);
      const response = await context.request.get(metrics.currentSrc, { headers: { Accept: "image/webp" } });
      expect(response.ok()).toBe(true);
      const size = 44 * dpr;
      const originalRaster = await sharp("src/shared/assets/logo/logo.svg", { density: 300 })
        .resize(size, size, { fit: "contain", background: "#00000000" }).png().toBuffer();
      const original = await sharp(originalRaster).flatten({ background: "#4c3351" }).removeAlpha().raw().toBuffer();
      const optimized = await sharp(await response.body()).resize(size, size)
        .flatten({ background: "#4c3351" }).removeAlpha().raw().toBuffer();
      expect(optimized.length).toBe(original.length);
      const meanDifference = optimized.reduce((total, channel, index) => total + Math.abs(channel - original[index]), 0) / original.length;
      const comparisonPath = testInfo.outputPath(`logo-${size}px.png`);
      await sharp({ create: { width: size * 2, height: size, channels: 3, background: "#4c3351" } })
        .composite([
          { input: original, raw: { width: size, height: size, channels: 3 }, left: 0, top: 0 },
          { input: optimized, raw: { width: size, height: size, channels: 3 }, left: size, top: 0 },
        ]).png().toFile(comparisonPath);
      await testInfo.attach("logo-original-optimized.png", { path: comparisonPath, contentType: "image/png" });
      const metricsPath = testInfo.outputPath("logo-sizing.json");
      await writeFile(metricsPath, JSON.stringify({ dpr, meanDifference, ...metrics }, null, 2));
      await testInfo.attach("logo-sizing.json", { path: metricsPath, contentType: "application/json" });
      expect(meanDifference).toBe(0);
    } finally {
      await context.close();
    }
  });
}
