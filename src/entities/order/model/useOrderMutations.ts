import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { serializeApiError } from "@/shared/lib/errorHandler";
import { useQueryClient } from "@tanstack/react-query";
import { OrderCreateModel, OrderCancel } from "../model/types";
import { orderApi } from "../api/orderApi";
import { orderQueryKeys } from "./queryKeys";

const invalidateOrdersLists = (
  queryClient: ReturnType<typeof useQueryClient>,
  scope: ReturnType<typeof usePrivateScope>,
): Promise<void> =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: scope.key(orderQueryKeys.caseHistories()) }),
    queryClient.invalidateQueries({
      queryKey: scope.key(orderQueryKeys.sellerOrders()),
    }),
    queryClient.invalidateQueries({
      queryKey: scope.key(orderQueryKeys.customerOrders()),
    }),
  ]).then(() => undefined);

const logMutationError = (message: string) => {
  return (error: unknown) => {
    console.error(message, serializeApiError(error));
  };
};

// Хук для создания заказа
export const useCreateOrder = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: (orderData: OrderCreateModel) =>
      orderApi.createOrder([orderData]),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: scope.key(orderQueryKeys.orderData(variables.productId)),
      });
      queryClient.invalidateQueries({
        queryKey: scope.key(orderQueryKeys.customerOrders()),
      });
    },
    onError: logMutationError("Ошибка создания заказа:"),
  });
};

// Хук для подтверждения заказа продавцом
export const useConfirmOrderBySeller = () => {
  const queryClient = useQueryClient();
  const scope = usePrivateScope();

  return usePrivateMutation({
    mutationKey: scope.key(orderQueryKeys.sellerConfirmation("order")),
    networkMode: "always",
    mutationFn: ({
      orderId,
      comment = "",
    }: {
      orderId: number;
      comment?: string;
    }) => orderApi.confirmOrderBySeller(orderId, comment),
    onSettled: () => invalidateOrdersLists(queryClient, scope),
    onError: logMutationError("Ошибка подтверждения заказа продавцом:"),
  });
};

// Хук для подтверждения получения заказа покупателем
export const useConfirmReceiptByCustomer = () => {
  const queryClient = useQueryClient();
  const scope = usePrivateScope();

  return usePrivateMutation({
    mutationFn: ({
      orderId,
      comment = "",
    }: {
      orderId: number;
      comment?: string;
    }) => orderApi.confirmReceiptByCustomer(orderId, comment),
    onSettled: () => invalidateOrdersLists(queryClient, scope),
    onError: logMutationError("Ошибка подтверждения получения заказа:"),
  });
};

// Хук для отправки заказа продавцом
export const useSendOrderBySeller = () => {
  const queryClient = useQueryClient();
  const scope = usePrivateScope();

  return usePrivateMutation({
    mutationFn: ({
      orderId,
      deliveryUrl,
      comment = "",
    }: {
      orderId: number;
      deliveryUrl: string;
      comment?: string;
    }) => orderApi.sendOrderBySeller(orderId, deliveryUrl, comment),
    onSettled: () => invalidateOrdersLists(queryClient, scope),
    onError: logMutationError("Ошибка отправки заказа:"),
  });
};

// Хук для отмены заказа
export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  const scope = usePrivateScope();

  return usePrivateMutation({
    mutationFn: ({ orderId, ...body }: OrderCancel & { orderId: number }) => orderApi.cancelOrder(orderId, body),
    onSuccess: () => invalidateOrdersLists(queryClient, scope),
    onError: logMutationError("Ошибка отмены заказа:"),
  });
};
