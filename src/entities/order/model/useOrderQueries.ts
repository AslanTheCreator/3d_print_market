import { useCallback } from "react";
import { usePrivateScope } from "@/shared/lib/query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../api/orderApi";
import { getOrderPaymentBreakdown } from "../lib/orderPaymentBreakdown";
import { orderQueryKeys } from "./queryKeys";
import type { ListOrdersDto } from "./types";
import { hasCurrentDeliveryVersion } from "./orderTermsQueries";

function useCurrentOrderCalculations() {
  const client = useQueryClient();
  const scope = usePrivateScope();
  return useCallback((orders: ListOrdersDto[]) => orders.map(order =>
    hasCurrentDeliveryVersion(client, scope, order) ? order : { ...order, calculation: null }
  ), [client, scope]);
}

// Проверяет уже полученный ответ, включая окно между записью в кэш и рендером.
export function usePaymentTermsCheck(role: "customer" | "seller") {
  const scope = usePrivateScope();
  const client = useQueryClient();
  const key = role === "customer" ? orderQueryKeys.customerOrders() : orderQueryKeys.sellerOrders();
  return (order: Pick<ListOrdersDto, "orderId" | "actualStatus" | "calculation" | "termsVersion">) => {
    const query = client.getQueryState<ListOrdersDto[]>(scope.key(key));
    const cached = query?.data?.find(item => item.orderId === order.orderId);
    return scope.isCurrent() && query?.status === "success" && cached?.actualStatus === order.actualStatus &&
      hasCurrentDeliveryVersion(client, scope, cached) &&
      getOrderPaymentBreakdown(cached).fingerprint === getOrderPaymentBreakdown(order).fingerprint;
  };
}

interface OrderQueryOptions {
  enabled?: boolean;
}

export const useOrderData = (productId: number) => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(orderQueryKeys.orderData(productId)),
    queryFn: ({ signal }) => orderApi.getOrderData(productId, signal),
    enabled: scope.id !== null && (!!productId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useSellerOrders = ({ enabled = true }: OrderQueryOptions = {}) => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(orderQueryKeys.sellerOrders()),
    queryFn: ({ signal }) => orderApi.getSellerOrders(signal),
    select: useCurrentOrderCalculations(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: scope.id !== null && enabled,
  });
};

export const useCustomerOrders = ({
  enabled = true,
}: OrderQueryOptions = {}) => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(orderQueryKeys.customerOrders()),
    queryFn: ({ signal }) => orderApi.getCustomerOrders(signal),
    select: useCurrentOrderCalculations(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: scope.id !== null && enabled,
  });
};
