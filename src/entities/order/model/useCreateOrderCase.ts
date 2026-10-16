import { useQueryClient } from "@tanstack/react-query";
import { usePrivateMutation, usePrivateScope } from "@/shared/lib/query";
import { orderCasesApi } from "../api/orderCasesApi";
import type { CreateOrderCaseRequest } from "./orderCase";
import { orderQueryKeys } from "./queryKeys";

export function useCreateOrderCase() {
  const client = useQueryClient();
  const scope = usePrivateScope();
  return usePrivateMutation({
    mutationFn: (request: CreateOrderCaseRequest) => orderCasesApi.create(request),
    retry: false,
    onSuccess: (_, { orderId }) => {
      // Принятый POST не становится неудачным из-за refetch; чтением владеет сценарий.
      for (const key of [orderQueryKeys.customerOrders(), orderQueryKeys.sellerOrders(), orderQueryKeys.cases(orderId)]) {
        void client.invalidateQueries({ queryKey: scope.key(key), exact: true, refetchType: "none" });
      }
    },
  });
}
