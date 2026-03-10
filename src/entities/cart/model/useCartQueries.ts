import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { cartApi } from "../api/cartApi";
import { cartKeys } from "./queryKeys";
import { ProductBasket } from "../model/types";
import { useCartQuantityStore } from "../model/cartQuantityStore";

export const useCartProducts = (options?: { enabled?: boolean }) => {
  const syncWithServer = useCartQuantityStore((state) => state.syncWithServer);

  const query = useQuery<ProductBasket[]>({
    queryKey: cartKeys.all,
    queryFn: () => cartApi.getCart({ size: 100 }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: options?.enabled ?? true,
  });

  // Синхронизируем Zustand с данными сервера при успешной загрузке
  useEffect(() => {
    if (query.data) {
      const serverItems = query.data.map((item) => ({
        productId: item.product.id,
        count: item.count,
      }));
      syncWithServer(serverItems);
    }
  }, [query.data, syncWithServer]);

  return query;
};
