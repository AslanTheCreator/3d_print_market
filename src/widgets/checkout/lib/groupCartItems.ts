import { ProductBasket } from "@/entities/cart";

export type SellerGroup = {
  sellerId: number;
  sellerName: string;
  items: ProductBasket[];
};

export const groupCartItemsBySeller = (
  cartItems: ProductBasket[],
): SellerGroup[] => {
  const groups = cartItems.reduce(
    (acc, item) => {
      const sellerId = item.sellerId;
      if (!acc[sellerId]) {
        acc[sellerId] = {
          sellerId,
          sellerName: `Продавец ${sellerId}`,
          items: [],
        };
      }
      acc[sellerId].items.push(item);
      return acc;
    },
    {} as Record<number, SellerGroup>,
  );

  return Object.values(groups);
};
