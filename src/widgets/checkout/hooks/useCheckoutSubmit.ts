"use client";

import { useState, useCallback } from "react";
import { ProductBasket, useCartQuantityStore } from "@/entities/cart";
import { orderApi } from "@/entities/order/api/orderApi";
import { useQueryClient } from "@tanstack/react-query";
import { cartKeys } from "@/entities/cart/hooks/queryKeys";
import { orderQueryKeys } from "@/entities/order/hooks/queryKeys";
import { CheckoutState } from "./useCheckoutState";
import { OrderResult, CheckoutResult, OrderToCreate } from "../model/types";

interface UseCheckoutSubmitProps {
  cartItems: ProductBasket[] | undefined;
  checkoutState: CheckoutState;
  onSuccess: (result: CheckoutResult) => void;
  onPartialSuccess: (result: CheckoutResult) => void;
  onError: (result: CheckoutResult) => void;
}

export const useCheckoutSubmit = ({
  cartItems,
  checkoutState,
  onSuccess,
  onPartialSuccess,
  onError,
}: UseCheckoutSubmitProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<CheckoutResult | null>(null);

  const queryClient = useQueryClient();
  const { getQuantity, removeItem: removeQuantityItem } =
    useCartQuantityStore();

  const handleSubmit = useCallback(async () => {
    if (!cartItems?.length || !checkoutState.isReadyToSubmit) {
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    // Формируем список заказов для создания
    const ordersToCreate: OrderToCreate[] = cartItems.map((item) => {
      const transferId = checkoutState.getTransferIdForSeller(item.sellerId);
      const quantity = getQuantity(item.id);

      return {
        productId: item.id,
        productName: item.name,
        count: quantity,
        addressId: checkoutState.selectedAddress?.id || 0,
        transferId: transferId || 0,
        sellerId: item.sellerId,
        comment: checkoutState.comment,
      };
    });

    // Создаём промисы для всех заказов
    const orderPromises = ordersToCreate.map(
      async (order): Promise<OrderResult> => {
        try {
          await orderApi.createOrder({
            productId: order.productId,
            count: order.count,
            addressId: order.addressId,
            transferId: order.transferId,
            comment: order.comment,
          });

          return {
            productId: order.productId,
            productName: order.productName,
            status: "success",
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Неизвестная ошибка";

          return {
            productId: order.productId,
            productName: order.productName,
            status: "error",
            errorMessage,
          };
        }
      },
    );

    // Выполняем все запросы параллельно
    const results = await Promise.allSettled(orderPromises);

    // Обрабатываем результаты
    const successResults: OrderResult[] = [];
    const failedResults: OrderResult[] = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const orderResult = result.value;
        if (orderResult.status === "success") {
          successResults.push(orderResult);
        } else {
          failedResults.push(orderResult);
        }
      } else {
        // Promise rejected (не должно происходить т.к. мы ловим ошибки внутри)
        failedResults.push({
          productId: 0,
          productName: "Неизвестный товар",
          status: "error",
          errorMessage: result.reason?.message || "Ошибка сети",
        });
      }
    });

    const checkoutResult: CheckoutResult = {
      success: successResults,
      failed: failedResults,
      totalCount: ordersToCreate.length,
      successCount: successResults.length,
    };

    setSubmitResult(checkoutResult);

    // Очищаем успешные товары из корзины и quantity store
    for (const successOrder of successResults) {
      removeQuantityItem(successOrder.productId);
    }

    // Инвалидируем кэши
    await queryClient.invalidateQueries({ queryKey: cartKeys.all });
    await queryClient.invalidateQueries({
      queryKey: orderQueryKeys.customerOrders(),
    });

    setIsSubmitting(false);

    // Вызываем соответствующий колбэк
    if (successResults.length === ordersToCreate.length) {
      onSuccess(checkoutResult);
    } else if (successResults.length > 0) {
      onPartialSuccess(checkoutResult);
    } else {
      onError(checkoutResult);
    }

    return checkoutResult;
  }, [
    cartItems,
    checkoutState,
    getQuantity,
    removeQuantityItem,
    queryClient,
    onSuccess,
    onPartialSuccess,
    onError,
  ]);

  // Функция для повторной отправки неудачных заказов
  const retryFailed = useCallback(async () => {
    if (!submitResult || submitResult.failed.length === 0) return;

    const failedProductIds = submitResult.failed.map((f) => f.productId);
    const failedItems = cartItems?.filter((item) =>
      failedProductIds.includes(item.id),
    );

    if (!failedItems?.length) return;

    setIsSubmitting(true);

    const retryPromises = failedItems.map(
      async (item): Promise<OrderResult> => {
        try {
          const transferId = checkoutState.getTransferIdForSeller(
            item.sellerId,
          );
          const quantity = getQuantity(item.id);

          await orderApi.createOrder({
            productId: item.id,
            count: quantity,
            addressId: checkoutState.selectedAddress?.id || 0,
            transferId: transferId || 0,
            comment: checkoutState.comment,
          });

          return {
            productId: item.id,
            productName: item.name,
            status: "success",
          };
        } catch (error) {
          return {
            productId: item.id,
            productName: item.name,
            status: "error",
            errorMessage:
              error instanceof Error ? error.message : "Неизвестная ошибка",
          };
        }
      },
    );

    const results = await Promise.allSettled(retryPromises);

    const newSuccessResults: OrderResult[] = [];
    const stillFailedResults: OrderResult[] = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const orderResult = result.value;
        if (orderResult.status === "success") {
          newSuccessResults.push(orderResult);
          removeQuantityItem(orderResult.productId);
        } else {
          stillFailedResults.push(orderResult);
        }
      }
    });

    // Обновляем результат
    const updatedResult: CheckoutResult = {
      success: [...submitResult.success, ...newSuccessResults],
      failed: stillFailedResults,
      totalCount: submitResult.totalCount,
      successCount: submitResult.successCount + newSuccessResults.length,
    };

    setSubmitResult(updatedResult);

    // Инвалидируем кэши
    await queryClient.invalidateQueries({ queryKey: cartKeys.all });
    await queryClient.invalidateQueries({
      queryKey: orderQueryKeys.customerOrders(),
    });

    setIsSubmitting(false);

    if (stillFailedResults.length === 0) {
      onSuccess(updatedResult);
    } else {
      onPartialSuccess(updatedResult);
    }
  }, [
    submitResult,
    cartItems,
    checkoutState,
    getQuantity,
    removeQuantityItem,
    queryClient,
    onSuccess,
    onPartialSuccess,
  ]);

  return {
    handleSubmit,
    retryFailed,
    isSubmitting,
    submitResult,
    clearResult: () => setSubmitResult(null),
  };
};
