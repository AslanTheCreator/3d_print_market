import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { cartApi } from "../api/cartApi";
import { cartKeys } from "./queryKeys";
import { ProductBasket } from "./types";
import { useCartQuantityStore } from "./cartQuantityStore";

export interface UseCartProductsOptions {
  enabled?: boolean;
  forceRefetchOnMount?: boolean;
}

export const useCartProducts = (options?: UseCartProductsOptions) => {
  const syncWithServer = useCartQuantityStore((state) => state.syncWithServer);

  const query = useQuery<ProductBasket[]>({
    queryKey: cartKeys.all,
    queryFn: () => cartApi.getCart({ size: 100 }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: options?.enabled ?? true,
    refetchOnMount: options?.forceRefetchOnMount ? "always" : undefined,
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
  }, [query.data, query.dataUpdatedAt, syncWithServer]);

  return query;
};
