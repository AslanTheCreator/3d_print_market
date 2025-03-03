export function formatPrice(price: number | undefined | null): string {
  // Если price undefined или null, используем 0 как значение по умолчанию
  const safePrice = price ?? 0;

  // Форматируем цену
  const formattedPrice = safePrice
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formattedPrice} ₽`;
}
