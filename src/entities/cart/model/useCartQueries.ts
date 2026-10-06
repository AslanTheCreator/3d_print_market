import { usePrivateScope } from "@/shared/lib/query";
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
  const scope = usePrivateScope();
  const syncWithServer = useCartQuantityStore((state) => state.syncWithServer);

  const query = useQuery<ProductBasket[]>({
    queryKey: scope.key(cartKeys.all),
    queryFn: ({ signal }) => cartApi.getCart({ size: 100 }, signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: scope.id !== null && (options?.enabled ?? true),
    refetchOnMount: options?.forceRefetchOnMount ? "always" : undefined,
  });

  // Синхронизируем Zustand с данными сервера при успешной загрузке
  useEffect(() => {
    if (scope.isCurrent() && query.data) {
      const serverItems = query.data.map((item) => ({
        productId: item.product.id,
        count: item.count,
      }));
      syncWithServer(serverItems);
    }
  }, [query.data, query.dataUpdatedAt, syncWithServer, scope]);

  return query;
};
