import { ProductDetail } from "@/shared/types";

export const formatMoney = (
  value: number,
  currency: ProductDetail["currency"],
): string =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export const getStockColor = (
  count: number | null,
): "success" | "warning" | "error" => {
  if (count === null) return "success";
  if (count === 0) return "error";
  if (count <= 3) return "warning";
  return "success";
};
