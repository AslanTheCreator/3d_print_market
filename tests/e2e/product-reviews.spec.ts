import { expect, test, type Locator } from "@playwright/test";
import type { Review } from "@/entities/review";
import { formatReviewDate } from "@/widgets/product-details/ui/productDetailsFormatters";

const fixtureAvailable = !process.env.TEST_BASE_URL || Boolean(process.env.PLAYWRIGHT_FIXTURE_API_URL);
const fixtureUrl = process.env.PLAYWRIGHT_FIXTURE_API_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_FIXTURE_API_PORT ?? Number(process.env.PLAYWRIGHT_PORT ?? 3000) + 1}`;

test("review date preserves ISO formatting and safely handles empty/invalid timestamps", () => {
  expect(formatReviewDate("2026-07-28T10:00:00.000Z")).toBe("28 июля");
  for (const value of ["", " ", "invalid-date", "2026-99-99T10:00:00.000Z", "+999999-01-01T00:00:00.000Z"]) {
    expect(formatReviewDate(value)).toBe("Дата неизвестна");
  }
});

async function expectUnclippedComment(comment: Locator) {
  await expect(comment).toBeVisible();
  const geometry = await comment.evaluate(element => {
    const card = element.closest(".MuiPaper-root")!;
    const text = element.getBoundingClientRect();
    const paper = card.getBoundingClientRect();
    return { height: paper.height, clipped: text.bottom > paper.bottom + 1 || text.top < paper.top - 1 };
  });
  expect(geometry.height).toBeGreaterThan(180);
  expect(geometry.clipped).toBe(false);
}

async function tailBounds(comment: Locator) {
  return comment.evaluate(element => {
    const text = element.firstChild!;
    const range = document.createRange();
    range.setStart(text, text.textContent!.lastIndexOf("Конец отзыва"));
    range.setEnd(text, text.textContent!.length);
    const tail = range.getBoundingClientRect();
    return { top: tail.top, bottom: tail.bottom, viewportHeight: window.innerHeight };
  });
}

for (const width of [393, 600, 768, 1280]) {
  test(`complete reviews and invalid dates remain readable with keyboard at ${width}px`, async ({ page, request }, testInfo) => {
    test.skip(!fixtureAvailable, "Requires local SSR fixture");
    await page.setViewportSize({ width, height: 900 });
    await page.route("https://mc.yandex.ru/**", route => route.fulfill({ status: 200, body: "" }));
    await page.route("**/products/find", route => route.fulfill({ contentType: "application/json", body: "[]" }));
    const fixture = await request.get(`${fixtureUrl}/product/925`);
    expect(fixture.ok()).toBe(true);
    const { reviews } = await fixture.json() as { reviews: Review[] };
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto("/catalog/925/detail");
    await expect(page.getByRole("heading", { name: "Товар с полными отзывами", exact: true })).toBeVisible();
    await page.keyboard.press("Control+End");

    if (width < 600) {
      const trigger = page.getByRole("button", { name: "Все", exact: true, includeHidden: true });
      await trigger.focus();
      await expect(trigger).toBeFocused();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Отзывы", exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute("aria-modal", "true");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      const region = dialog.getByRole("region", { name: "Список отзывов", exact: true });
      for (const review of reviews) {
        const comment = region.getByText(review.comment, { exact: true });
        await expect(comment).toHaveText(review.comment);
        await expectUnclippedComment(comment);
      }
      await expect(region.getByText("Дата неизвестна", { exact: true })).toHaveCount(2);
      const close = dialog.getByRole("button", { name: "Закрыть отзывы", exact: true });
      await close.focus();
      await page.keyboard.press("Tab");
      await expect(region).toBeFocused();
      await expect(region).toHaveCSS("outline-style", "solid");
      await page.keyboard.press("End");
      const last = region.getByText(reviews[4].comment, { exact: true });
      await expect.poll(async () => {
        const bounds = await tailBounds(last);
        const box = (await region.boundingBox())!;
        return bounds.top >= box.y && bounds.bottom <= box.y + box.height + 1;
      }).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("full-review-mobile.png") });
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await page.keyboard.press("Space");
      await expect(dialog).toBeVisible();
      await close.focus();
      await page.keyboard.press("Enter");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    } else {
      const slider = page.locator(".product-reviews-swiper");
      for (const review of reviews) {
        const comment = slider.getByText(review.comment, { exact: true });
        await expect(comment).toHaveText(review.comment);
        await expectUnclippedComment(comment);
      }
      await expect(slider.getByText("28 июля", { exact: true })).toHaveCount(1);
      await expect(slider.getByText("Дата неизвестна", { exact: true })).toHaveCount(2);
      const next = page.getByRole("button", { name: "Следующий отзыв", exact: true });
      for (const [index, key] of [[3, "Enter"], [4, "Space"]] as const) {
        await next.focus();
        await page.keyboard.press(key);
        await page.keyboard.press("PageDown");
        await expect(slider.getByText(reviews[index].comment, { exact: true })).toBeInViewport({ ratio: 0.01 });
      }
      await expect(next).toBeDisabled();
      await page.keyboard.press("Control+End");
      const last = slider.getByText(reviews[4].comment, { exact: true });
      await expect.poll(async () => {
        const bounds = await tailBounds(last);
        return bounds.top >= 0 && bounds.bottom <= bounds.viewportHeight;
      }).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`full-review-${width}.png`) });
      const previous = page.getByRole("button", { name: "Предыдущий отзыв", exact: true });
      await previous.focus();
      await page.keyboard.press("Space");
      await expect(next).toBeEnabled();
    }
    await expect(page.locator("body")).not.toContainText("Application error");
    expect(pageErrors).toEqual([]);
  });
}
