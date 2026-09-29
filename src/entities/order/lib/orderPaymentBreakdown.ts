import type { ListOrdersModel } from "../model/types";

export interface OrderPaymentBreakdown {
  hasPrepayment: boolean;
  quantity: number;
  prepaymentTotal: number;
  remainingTotal: number;
  productTotal: number;
}

export const getOrderPaymentBreakdown = (
  order: ListOrdersModel,
): OrderPaymentBreakdown => {
  const quantity = order.product.count;
  const remainingTotal = order.totalPrice;
  const prepaymentTotal = order.prepaymentAmount;

  return {
    hasPrepayment: prepaymentTotal > 0,
    quantity,
    prepaymentTotal,
    remainingTotal,
    productTotal: prepaymentTotal + remainingTotal,
  };
};
