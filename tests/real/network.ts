import type { Page } from "@playwright/test";

// Не подменяем API: только запрещаем внешнюю телеметрию с синтетического DEV.
export async function blockExternalTelemetry(page: Page) {
  // Network blocking не включает Fetch interception: OPTIONS выполняет Chromium
  // и получает ответ backend. Вызывать до goto для каждой страницы, включая ADMIN.
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setBlockedURLs", { urls: ["*://mc.yandex.ru/*"] });
  return session;
}
