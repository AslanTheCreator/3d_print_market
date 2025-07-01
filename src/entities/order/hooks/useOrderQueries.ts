import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/orderApi";
import { orderQueryKeys } from "./queryKeys";

// Хук для получения данных заказа
export const useOrderData = (productId: number) => {
  return useQuery({
    queryKey: orderQueryKeys.orderData(productId),
    queryFn: () => orderApi.getOrderData(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 минут по умолчанию
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
  });
};

// Хук для получения заказов продавца
export const useSellerOrders = () => {
  return useQuery({
    queryKey: orderQueryKeys.sellerOrders(),
    queryFn: () => orderApi.getSellerOrders(),
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут в кэше
    refetchOnWindowFocus: true, // Обновлять при фокусе на окне
  });
};

// Хук для получения заказов покупателя
export const useCustomerOrders = () => {
  return useQuery({
    queryKey: orderQueryKeys.customerOrders(),
    queryFn: () => orderApi.getCustomerOrders(),
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут в кэше
    refetchOnWindowFocus: true,
  });
};
