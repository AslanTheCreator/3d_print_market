import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "./orderApi";
import { OrderCreateModel, OrderGetDataModel } from "../model/types";

// Query Keys для консистентности
export const orderQueryKeys = {
  all: ["orders"] as const,
  orderData: (productId: number) =>
    [...orderQueryKeys.all, "data", productId] as const,
};

// Хук для получения данных заказа
export const useOrderData = (productId: number) => {
  return useQuery({
    queryKey: orderQueryKeys.orderData(productId),
    queryFn: () => orderApi.getOrderData(productId),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 минут по умолчанию
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
  });
};

// Хук для создания заказа
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: OrderCreateModel) =>
      orderApi.createOrder(orderData),
    onSuccess: (_, variables) => {
      // Инвалидируем кэш данных заказа для этого продукта
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.orderData(variables.productId),
      });

      // Можно также инвалидировать другие связанные запросы
      // например, список заказов пользователя, корзину и т.д.
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.all,
      });
    },
    onError: (error) => {
      // Здесь можно добавить дополнительную обработку ошибок
      console.error("Ошибка создания заказа:", error);
    },
  });
};

// Хук для подтверждения заказа продавцом
export const useConfirmOrderBySeller = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      accountId,
    }: {
      orderId: number;
      accountId: number;
    }) => orderApi.confirmOrderBySeller(orderId, accountId),
    onSuccess: () => {
      // Инвалидируем все запросы заказов, так как статус изменился
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.all,
      });
    },
    onError: (error) => {
      console.error("Ошибка подтверждения заказа:", error);
    },
  });
};

// Дополнительные хуки для удобства использования

// Хук для предзагрузки данных заказа (полезно для hover эффектов)
export const usePrefetchOrderData = () => {
  const queryClient = useQueryClient();

  return (productId: number) => {
    queryClient.prefetchQuery({
      queryKey: orderQueryKeys.orderData(productId),
      queryFn: () => orderApi.getOrderData(productId),
      staleTime: 5 * 60 * 1000,
    });
  };
};

// Хук для получения данных заказа из кэша (без запроса)
export const useOrderDataFromCache = (productId: number) => {
  const queryClient = useQueryClient();

  return queryClient.getQueryData<OrderGetDataModel>(
    orderQueryKeys.orderData(productId)
  );
};
