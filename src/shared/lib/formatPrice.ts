export function formatPrice(price: number | undefined | null): string {
  // Если price undefined или null, используем 0 как значение по умолчанию
  const safePrice = price ?? 0;

  return new Intl.NumberFormat("ru-RU").format(safePrice);
}
