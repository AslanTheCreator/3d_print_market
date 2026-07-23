import type { ProductBasket } from "@/entities/cart";
import type { OrderResult, OrderToCreate } from "./types";

interface BuildOrderToCreateProps {
  item: ProductBasket;
  quantity: number;
  addressId: number;
  transferId: number | null;
  comment: string;
}

export const buildOrderToCreate = ({
  item,
  quantity,
  addressId,
  transferId,
  comment,
}: BuildOrderToCreateProps): OrderToCreate => {
  return {
    productId: item.product.id,
    productName: item.product.name,
    count: quantity,
    addressId,
    transferId: transferId || 0,
    comment,
  };
};

export const getFailedOrders = (
  orders: readonly OrderToCreate[],
  failedResults: readonly OrderResult[],
): OrderToCreate[] => {
  const failedProductIds = new Set(
    failedResults
      .filter((result) => result.retryable !== false)
      .map((result) => result.productId),
  );

  return orders.filter((order) => failedProductIds.has(order.productId));
};
