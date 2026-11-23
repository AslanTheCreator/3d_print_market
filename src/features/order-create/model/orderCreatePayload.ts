import type { ProductBasket } from "@/entities/cart";
import { getDeliveryFieldErrors, type OrderCreateModel } from "@/entities/order";
import type { OrderCreateCheckoutState, OrderResult, OrderToCreate } from "./types";

interface BuildOrderToCreateProps {
  item: ProductBasket;
  quantity: number;
  addressId?: number;
  transferId: number | null;
  comment: string;
  carrierDelivery?: OrderCreateCheckoutState["carrierDelivery"];
}

export const buildOrderToCreate = ({
  item,
  quantity,
  addressId,
  transferId,
  comment,
  carrierDelivery,
}: BuildOrderToCreateProps): OrderToCreate | null => {
  if (carrierDelivery) {
    const { deliveryCarrier, deliveryAddress } = carrierDelivery;
    const errors = getDeliveryFieldErrors(deliveryCarrier, deliveryAddress);
    if (!deliveryCarrier || errors.carrier || errors.address) return null;
    return {
      productId: item.product.id,
      productName: item.product.name,
      count: quantity,
      deliveryCarrier,
      deliveryAddress: deliveryAddress.trim(),
      ...(comment ? { comment } : {}),
    };
  }
  if (!addressId || !transferId) return null;
  return {
    productId: item.product.id,
    productName: item.product.name,
    count: quantity,
    addressId,
    transferId,
    comment,
  };
};

export function toOrderRequest({ productName: _productName, ...request }: OrderToCreate): OrderCreateModel {
  return request;
}

export function hasCreatedOrderIds(response: unknown, expectedCount: number): boolean {
  return Array.isArray(response) && response.length === expectedCount &&
    [...response].every(id => typeof id === "number" && Number.isSafeInteger(id) && id > 0) &&
    new Set(response).size === expectedCount;
}

export const getFailedOrders = (
  orders: readonly OrderToCreate[],
  failedResults: readonly OrderResult[],
): OrderToCreate[] => {
  const failedProductIds = new Set(
    failedResults
      .filter((result) => result.status === "error" && result.retryable === true)
      .map((result) => result.productId),
  );

  return orders.filter((order) => failedProductIds.has(order.productId));
};
