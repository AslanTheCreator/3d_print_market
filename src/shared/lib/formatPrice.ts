export function formatPrice(
  price: number | undefined | null,
  currency?: string
): string {
  const safePrice = price ?? 0;

  return new Intl.NumberFormat(
    "ru-RU",
    currency
      ? {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }
      : undefined
  ).format(safePrice);
}
