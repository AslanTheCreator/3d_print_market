import { CartProductModel } from "@/entities/cart";

export type SellerGroup = {
  sellerId: number;
  sellerName: string;
  items: CartProductModel[];
};

export const groupCartItemsBySeller = (
  cartItems: CartProductModel[]
): SellerGroup[] => {
  const groups = cartItems.reduce((acc, item) => {
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
  }, {} as Record<number, SellerGroup>);

  return Object.values(groups);
};
