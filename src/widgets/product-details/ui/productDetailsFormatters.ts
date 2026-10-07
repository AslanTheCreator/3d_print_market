import { ProductDetail } from "@/entities/product";
import { formatPrice } from "@/shared/lib";

export const formatMoney = (
  value: number,
  currency: ProductDetail["currency"],
): string => formatPrice(value, currency);

export const getStockColor = (
  count: number | null,
): "success" | "warning" | "error" => {
  if (count === null) return "success";
  if (count === 0) return "error";
  if (count <= 3) return "warning";
  return "success";
};

export const formatStockCount = (
  count: number | null,
  variant: "full" | "compact" = "full",
): string => {
  if (count === null) return "∞ в наличии";
  if (count === 0) return "Нет в наличии";
  if (count === 1) return variant === "compact" ? "1 шт." : "1 шт. в наличии";
  return variant === "compact" ? `${count} шт.` : `${count} шт. в наличии`;
};

export const formatReviewsLabel = (count: number): string => {
  if (count === 1) return "1 отзыв";
  if (count >= 2 && count <= 4) return `${count} отзыва`;
  return `${count} отзывов`;
};

export const getSellerCardMeta = (
  totalReviews: number,
  sellerRating: number,
) => ({
  hasRating: totalReviews > 0,
  ratingLabel: totalReviews > 0 ? `${sellerRating.toFixed(1)}` : "Без оценок",
  reviewsLabel: totalReviews > 0 ? formatReviewsLabel(totalReviews) : "нет отзывов",
});

export const formatAverageRating = (value: number): string =>
  value.toFixed(1).replace(".", ",");

export const formatReviewDate = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Дата неизвестна";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
};
