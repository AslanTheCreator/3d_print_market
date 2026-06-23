import { getCurrencySymbol } from "@/entities/product";
import type { CategoryModel, Currency } from "@/shared/types";

const currencySymbols: Record<Currency, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
};

export const getReadableCurrencySymbol = (currency: Currency): string =>
  currencySymbols[currency] ?? getCurrencySymbol(currency);

export const flattenCategories = (
  categories: CategoryModel[],
  depth = 0,
): Array<CategoryModel & { depth: number }> =>
  categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.childs, depth + 1),
  ]);
