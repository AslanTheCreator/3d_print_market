import { Availability } from "@/entities/product/model/types";

/**
 * Рассчитывает остаток к оплате для предзаказа
 */
export const calculateRemainingPayment = (
  price: number,
  prepaymentAmount: number,
): number => {
  return Math.max(0, price - prepaymentAmount);
};

/**
 * Проверяет валидность цены предзаказа
 */
export const isValidPreorderPrice = (
  price: number,
  prepaymentAmount: number,
): boolean => {
  return prepaymentAmount > 0 && prepaymentAmount < price;
};

/**
 * Получает основную цену для отображения в зависимости от типа товара
 */
export const getDisplayPrice = (
  price: number,
  prepaymentAmount: number,
  availability: Availability,
): number => {
  return availability === "PREORDER" ? prepaymentAmount : price;
};
