import type { ListOrdersModel } from "../model/types";

export interface OrderPaymentBreakdown {
  isPreorder: boolean;
  quantity: number;
  prepaymentTotal: number;
  remainingTotal: number;
  productTotal: number;
}

export const getOrderPaymentBreakdown = (
  order: ListOrdersModel,
): OrderPaymentBreakdown => {
  const isPreorder = order.product.availability === "PREORDER";
  const quantity = order.product.count;
  const remainingTotal = order.totalPrice;
  const prepaymentTotal = isPreorder
    ? order.product.prepaymentAmount * quantity
    : 0;

  return {
    isPreorder,
    quantity,
    prepaymentTotal,
    remainingTotal,
    productTotal: isPreorder
      ? prepaymentTotal + remainingTotal
      : remainingTotal,
  };
};
