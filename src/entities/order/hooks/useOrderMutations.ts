import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderCreateModel } from "../model/types";
import { orderApi } from "../api/orderApi";
import { orderQueryKeys } from "./queryKeys";

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

      // Инвалидируем все заказы покупателя
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });
    },
    onError: (error) => {
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
      comment = "",
    }: {
      orderId: number;
      accountId: number;
      comment?: string;
    }) => orderApi.confirmOrderBySeller(orderId, accountId, comment),
    onSuccess: () => {
      // Инвалидируем заказы продавца
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.sellerOrders(),
      });

      // Инвалидируем заказы покупателя (для обновления статуса)
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });
    },
    onError: (error) => {
      console.error("Ошибка подтверждения заказа продавцом:", error);
    },
  });
};

// Хук для подтверждения предзаказа продавцом
export const useConfirmPreOrderBySeller = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      comment = "",
    }: {
      orderId: number;
      comment?: string;
    }) => orderApi.confirmPreOrderBySeller(orderId, comment),
    onSuccess: () => {
      // Инвалидируем заказы продавца
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.sellerOrders(),
      });

      // Инвалидируем заказы покупателя
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });
    },
    onError: (error) => {
      console.error("Ошибка подтверждения предзаказа продавцом:", error);
    },
  });
};

// Хук для подтверждения предоплаты покупателем
export const useConfirmPrepaymentByCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      imageId,
      comment = "",
    }: {
      orderId: number;
      imageId: number;
      comment?: string;
    }) => orderApi.confirmPrepaymentByCustomer(orderId, imageId, comment),
    onSuccess: () => {
      // Инвалидируем заказы покупателя
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });

      // Инвалидируем заказы продавца
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.sellerOrders(),
      });
    },
    onError: (error) => {
      console.error("Ошибка подтверждения предоплаты:", error);
    },
  });
};

// Хук для подтверждения оплаты покупателем
export const useConfirmPaymentByCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      imageId,
      comment = "",
    }: {
      orderId: number;
      imageId: number;
      comment?: string;
    }) => orderApi.confirmPaymentByCustomer(orderId, imageId, comment),
    onSuccess: () => {
      // Инвалидируем заказы покупателя
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });

      // Инвалидируем заказы продавца
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.sellerOrders(),
      });
    },
    onError: (error) => {
      console.error("Ошибка подтверждения оплаты:", error);
    },
  });
};

// Хук для подтверждения получения заказа покупателем
export const useConfirmReceiptByCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      comment = "",
    }: {
      orderId: number;
      comment?: string;
    }) => orderApi.confirmReceiptByCustomer(orderId, comment),
    onSuccess: () => {
      // Инвалидируем заказы покупателя
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });

      // Инвалидируем заказы продавца
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.sellerOrders(),
      });
    },
    onError: (error) => {
      console.error("Ошибка подтверждения получения заказа:", error);
    },
  });
};

// Хук для отправки заказа продавцом
export const useSendOrderBySeller = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      deliveryUrl,
      comment = "",
    }: {
      orderId: number;
      deliveryUrl: string;
      comment?: string;
    }) => orderApi.sendOrderBySeller(orderId, deliveryUrl, comment),
    onSuccess: () => {
      // Инвалидируем заказы продавца
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.sellerOrders(),
      });

      // Инвалидируем заказы покупателя
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });
    },
    onError: (error) => {
      console.error("Ошибка отправки заказа:", error);
    },
  });
};
