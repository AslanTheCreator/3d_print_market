import { ProductBasket } from "@/entities/cart";
import { OrderResult, OrderToCreate } from "./types";

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

export const getFailedCartItems = (
  cartItems: ProductBasket[] | undefined,
  failedOrders: OrderResult[],
) => {
  if (!cartItems?.length) {
    return [];
  }

  const failedProductIds = new Set(failedOrders.map((item) => item.productId));

  return cartItems.filter((item) => failedProductIds.has(item.product.id));
};
