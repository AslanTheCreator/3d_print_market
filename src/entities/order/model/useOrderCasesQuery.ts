import { useQuery } from "@tanstack/react-query";
import { usePrivateScope } from "@/shared/lib/query";
import { orderCasesApi } from "../api/orderCasesApi";
import { orderQueryKeys } from "./queryKeys";

export function useOrderCasesQuery(orderId: number | null) {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(orderQueryKeys.cases(orderId)),
    queryFn: ({ signal }) => {
      if (!scope.isCurrent() || orderId === null) throw new Error("История недоступна вне текущей сессии");
      return orderCasesApi.list(orderId, signal);
    },
    enabled: scope.id !== null && orderId !== null && Number.isSafeInteger(orderId) && orderId > 0,
    retry: false, staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: "always",
  });
}
