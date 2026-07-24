import { formatPrice } from "@/shared/lib";
import type { PriceRange } from "@/entities/product";

export const normalizeInputValue = (value: string): string =>
  value.replace(/\D/g, "");

export const parseInputValue = (value: string): number | undefined => {
  const normalized = normalizeInputValue(value);

  if (!normalized) {
    return undefined;
  }

  return Number(normalized);
};

export const formatInputValue = (value?: number): string => {
  if (value === undefined) {
    return "";
  }

  return formatPrice(value);
};

export const formatDesktopRangeLabel = (value?: PriceRange): string => {
  if (!value) {
    return "Цена, ₽";
  }

  const { minPrice, maxPrice } = value;

  if (minPrice !== undefined && maxPrice !== undefined) {
    return `Цена: от ${formatPrice(minPrice)} до ${formatPrice(maxPrice)}`;
  }

  if (minPrice !== undefined) {
    return `Цена: от ${formatPrice(minPrice)}`;
  }

  if (maxPrice !== undefined) {
    return `Цена: до ${formatPrice(maxPrice)}`;
  }

  return "Цена, ₽";
};
