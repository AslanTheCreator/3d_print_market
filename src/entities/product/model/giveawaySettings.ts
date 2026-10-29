import { getSafeTelegramUrl } from "@/shared/lib";
import { parseGiveawayDate } from "../lib/giveawayTiming";
import type { AdminGiveawayProductResponse, GiveawaySettingsRequest } from "./giveaway";

export type AdminGiveawayProduct = NonNullable<AdminGiveawayProductResponse["product"]>;
export interface GiveawaySettingsValues {
  enabled: boolean; telegramUrl: string; startAt: string; endAt: string;
  winnersCount: number; rules: string; homeText: string;
}
export const mapGiveawaySettings = (product: AdminGiveawayProduct): GiveawaySettingsValues => ({
  enabled: product.giveawayEnabled === true, telegramUrl: product.giveawayTelegramUrl ?? "",
  startAt: product.giveawayStartAt ?? "", endAt: product.giveawayEndAt ?? "",
  winnersCount: product.giveawayWinnersCount ?? 0, rules: product.giveawayRules ?? "", homeText: product.giveawayHomeText ?? "",
});
export function validateGiveawaySettings(values: GiveawaySettingsValues, now = Date.now()) {
  const errors: Partial<Record<keyof GiveawaySettingsValues, string>> = {};
  if (!getSafeTelegramUrl(values.telegramUrl.trim())) errors.telegramUrl = "Укажите HTTPS-ссылку t.me или telegram.me с непустым путём";
  if (!Number.isSafeInteger(values.winnersCount) || values.winnersCount <= 0) errors.winnersCount = "Введите положительное целое число";
  for (const field of ["rules", "homeText"] as const) if (!values[field].trim()) errors[field] = "Заполните текст";
  const start = parseGiveawayDate(values.startAt), end = parseGiveawayDate(values.endAt);
  if (start === null) errors.startAt = "Укажите корректную дату ISO 8601 с часовым поясом";
  if (end === null) errors.endAt = "Укажите корректную дату ISO 8601 с часовым поясом";
  if (start !== null && end !== null && start >= end) errors.endAt = "Окончание должно быть позже начала";
  if (end !== null && values.enabled && end <= now) errors.endAt = "Для включения окончание должно быть в будущем";
  return errors;
}
export function toGiveawaySettingsRequest(values: GiveawaySettingsValues): GiveawaySettingsRequest {
  if (Object.keys(validateGiveawaySettings(values)).length) throw new Error("Проверьте настройки розыгрыша");
  return { enabled: values.enabled, telegramUrl: getSafeTelegramUrl(values.telegramUrl.trim())!,
    startAt: new Date(values.startAt).toISOString(), endAt: new Date(values.endAt).toISOString(),
    winnersCount: values.winnersCount, rules: values.rules.trim(), homeText: values.homeText.trim() };
}
// Сравнение instant, а не текстового представления часового пояса.
export const giveawaySettingsFingerprint = (values: GiveawaySettingsValues) => JSON.stringify({ enabled: values.enabled,
  startAt: parseGiveawayDate(values.startAt) ?? values.startAt, endAt: parseGiveawayDate(values.endAt) ?? values.endAt,
  telegramUrl: getSafeTelegramUrl(values.telegramUrl.trim()) ?? values.telegramUrl.trim(), winnersCount: values.winnersCount, rules: values.rules.trim(), homeText: values.homeText.trim(),
});
