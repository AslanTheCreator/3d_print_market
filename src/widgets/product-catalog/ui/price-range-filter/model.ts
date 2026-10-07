import { formatPrice } from "@/shared/lib";
import type { PriceRange } from "@/entities/product";

export const normalizeInputValue = (value: string): string =>
  value.replace(/\s/g, "").replace(/,/g, ".");

export const parseInputValue = (value: string): number | undefined => {
  const normalized = normalizeInputValue(value);

  if (!/^\d+(\.\d*)?$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const formatInputValue = (value?: number): string => {
  if (value === undefined) {
    return "";
  }

  const [mantissa, exponent] = String(value).split("e");
  if (exponent === undefined) return mantissa;
  const [integer, fraction = ""] = mantissa.split(".");
  const digits = integer + fraction;
  const position = integer.length + Number(exponent);
  if (position <= 0) return `0.${"0".repeat(-position)}${digits}`;
  if (position >= digits.length) return digits + "0".repeat(position - digits.length);
  return `${digits.slice(0, position)}.${digits.slice(position)}`;
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
