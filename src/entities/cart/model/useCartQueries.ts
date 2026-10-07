import { usePrivateScope } from "@/shared/lib/query";
import { useQuery } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { cartKeys } from "./queryKeys";
import { ProductBasket } from "./types";

export interface UseCartProductsOptions {
  enabled?: boolean;
  forceRefetchOnMount?: boolean;
}

export const useCartProducts = (options?: UseCartProductsOptions) => {
  const scope = usePrivateScope();

  const query = useQuery<ProductBasket[]>({
    queryKey: scope.key(cartKeys.all),
    queryFn: ({ signal }) => cartApi.getCart({ size: 100 }, signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: scope.id !== null && (options?.enabled ?? true),
    refetchOnMount: options?.forceRefetchOnMount ? "always" : undefined,
  });

  return query;
};
