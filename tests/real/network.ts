import type { BrowserContext } from "@playwright/test";

// Не подменяем API: только запрещаем внешнюю телеметрию с синтетического DEV.
export async function blockExternalTelemetry(context: BrowserContext) {
  await context.route("https://mc.yandex.ru/**", route => route.abort("blockedbyclient"));
}
