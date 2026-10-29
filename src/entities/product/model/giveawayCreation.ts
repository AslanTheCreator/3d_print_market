import type { Currency } from "@/shared/types";
import { productCurrencies } from "./form";
import type { AdminGiveawayProductRequest } from "./giveaway";
import { toGiveawaySettingsRequest, type GiveawaySettingsValues } from "./giveawaySettings";

export interface GiveawayProductValues {
  name: string; description: string; currency: Currency; categoryIds: number[]; imageIds: number[];
}
export function validateGiveawayProduct(values: GiveawayProductValues) {
  const errors: Partial<Record<keyof GiveawayProductValues, string>> = {};
  if (!values.name.trim()) errors.name = "Введите название приза";
  if (!values.description.trim()) errors.description = "Введите описание приза";
  if (!productCurrencies.some(item => item.code === values.currency)) errors.currency = "Выберите валюту";
  for (const key of ["categoryIds", "imageIds"] as const)
    if (!values[key].every(id => Number.isSafeInteger(id) && id > 0)) errors[key] = "Связи должны содержать корректные ID";
  return errors;
}
export function buildGiveawayCreateRequest(product: GiveawayProductValues, settings: GiveawaySettingsValues): AdminGiveawayProductRequest {
  if (Object.keys(validateGiveawayProduct(product)).length) throw new Error("Проверьте данные приза");
  return { availability: "GIVEAWAY", name: product.name.trim(), description: product.description.trim(),
    currency: product.currency, categoryIds: [...product.categoryIds], imageIds: [...product.imageIds], giveaway: toGiveawaySettingsRequest(settings) };
}
