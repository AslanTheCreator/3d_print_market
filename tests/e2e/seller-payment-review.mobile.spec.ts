import { expect, test } from "@playwright/test";
import { reviewFixture } from "./helpers/sellerPaymentReview";

test("opens the authorized receipt full screen and can retry an unreadable proof", async ({ page, baseURL }) => {
  const { dialog, fixture, approve } = await reviewFixture(page, baseURL);
  await dialog.getByRole("button", { name: "Открыть чек" }).click();
  await expect(page.getByRole("dialog").last().getByRole("img").first()).toBeVisible();
  await page.keyboard.press("Escape");
  fixture.imageError = true;
  await dialog.getByRole("button", { name: "Перечитать чек" }).click();
  await expect(dialog.getByText(/Для подтверждения требуется/)).toBeVisible();
  await expect(approve).toBeDisabled();
  fixture.imageError = false;
  await dialog.getByRole("button", { name: "Перечитать чек" }).click();
  await expect(dialog.getByRole("button", { name: "Открыть чек" })).toBeEnabled();
  expect(fixture.proofIds.every(id => id === "700")).toBe(true);
  expect(fixture.posts).toEqual([]);
});
