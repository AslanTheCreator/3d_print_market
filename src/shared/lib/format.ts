export function formatPrice(price: number) {
  const formattedPrice = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formattedPrice} ₽`;
}
