import { usePrivateScope } from "@/shared/lib/query";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/orderApi";
import { orderQueryKeys } from "./queryKeys";

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
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: scope.id !== null && enabled,
  });
};