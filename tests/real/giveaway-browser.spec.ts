import { expect, test } from "@playwright/test";
import { connectDev } from "./backend.mjs";
import { blockExternalTelemetry } from "./network";

test.beforeEach(async ({ page }) => { await blockExternalTelemetry(page); });

for (const source of ["new", "converted"]) test(`real standalone ${source} GIVEAWAY crosses start and end without clock or API mocks`, async ({ page }) => {
  const dev = await connectDev();
  const config = { enabled: true, telegramUrl: "https://t.me/figurzilla_dev_test", startAt: new Date(Date.now() + 8000).toISOString(), endAt: new Date(Date.now() + 20_000).toISOString(), winnersCount: 1, rules: "Synthetic DEV rules", homeText: "Synthetic DEV announcement" };
  const id = source === "new" ? await dev.giveaway(config)
    : await dev.product("EXTERNAL_PRODUCT", { externalUrl: `https://example.invalid/${dev.marker}/public-conversion` }, "agent");
  if (source === "converted") {
    dev.success(await dev.request("admin", `/admin/actions/agents/2/products/${id}`, {
      name: `[ТЕСТ ${dev.marker}] converted public`, description: "Synthetic DEV prize",
      availability: "GIVEAWAY", price: 0, currency: "RUB", categoryIds: [132], imageIds: [], giveaway: config,
    }, "PUT"));
    expect(dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`)).product.giveawayEnabled).toBe(true);
    expect((await dev.request(null, `/product/${id}`)).status).toBe(404);
  }
  try {
    await page.setViewportSize({ width: 393, height: 727 });
    await page.goto(`/giveaways/${id}`);
    await expect(page.getByRole("link", { name: "Розыгрыш в Telegram", exact: true })).toHaveAttribute("href", config.telegramUrl);
    await expect(page.getByRole("link", { name: "Участвовать в Telegram", exact: true })).toBeVisible({ timeout: 15_000 });
    expect(dev.success(await dev.request(null, `/giveaways/products/${id}`)).status).toBe("ACTIVE");
    await expect(page.getByRole("heading", { name: "Розыгрыш завершён", exact: true })).toBeVisible({ timeout: 25_000 });
    expect((await dev.request(null, `/giveaways/products/${id}`)).status).toBe(404);
    await expect(page.getByRole("link", { name: "Участвовать в Telegram", exact: true })).toHaveCount(0);
  } finally {
    dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`, { ...config, enabled: false }, "PUT"));
    expect(dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`)).product.giveawayEnabled).toBe(false);
    await dev.save();
  }
});
