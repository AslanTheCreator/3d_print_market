import { useOrderData } from "@/entities/order";
import { SellerGroup } from "../lib/groupCartItems";

export const useOrderDataQueries = (sellerGroups: SellerGroup[]) => {
  return sellerGroups.map((group) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const query = useOrderData(group.items[0]?.id || 0);
    return {
      sellerId: group.sellerId,
      ...query,
    };
  });
};
