import { hashKey, type QueryClient } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";
import { useCartQuantityStore } from "./cartQuantityStore";
import { cartKeys } from "./queryKeys";
import type { ProductBasket } from "./types";

export function bindCartQuantityProjection(client: QueryClient, scope: PrivateScope) {
  const queryKey = scope.key(cartKeys.all);
  const queryHash = hashKey(queryKey);
  const sync = (cart: ProductBasket[] | undefined) => {
    if (!scope.isCurrent() || !cart) return;
    // Синхронизируем Zustand с данными сервера при успешной загрузке
    useCartQuantityStore.getState().syncWithServer(cart.map(item => ({
      productId: item.product.id,
      count: item.count,
    })));
  };
  const unsubscribe = client.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "success" && event.query.queryHash === queryHash) {
      sync(event.query.state.data as ProductBasket[] | undefined);
    }
  });
  sync(client.getQueryData<ProductBasket[]>(queryKey));
  return unsubscribe;
}
