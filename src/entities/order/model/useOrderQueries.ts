import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/orderApi";
import { orderQueryKeys } from "./queryKeys";

interface OrderQueryOptions {
  enabled?: boolean;
}

export const useOrderData = (productId: number) => {
  return useQuery({
    queryKey: orderQueryKeys.orderData(productId),
    queryFn: () => orderApi.getOrderData(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useSellerOrders = ({ enabled = true }: OrderQueryOptions = {}) => {
  return useQuery({
    queryKey: orderQueryKeys.sellerOrders(),
    queryFn: () => orderApi.getSellerOrders(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled,
  });
};

export const useCustomerOrders = ({
  enabled = true,
}: OrderQueryOptions = {}) => {
  return useQuery({
    queryKey: orderQueryKeys.customerOrders(),
    queryFn: () => orderApi.getCustomerOrders(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled,
  });
};