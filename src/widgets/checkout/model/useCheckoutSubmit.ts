"use client";

import { useState, useCallback } from "react";
import { ProductBasket, useCartQuantityStore } from "@/entities/cart";
import { orderApi } from "@/entities/order";
import { CheckoutState } from "./useCheckoutState";
import { OrderResult, CheckoutResult, OrderToCreate } from "../model/types";
import { useCheckoutSubmitSideEffects } from "./useCheckoutSubmitSideEffects";
import {
  buildOrderToCreate,
  getFailedCartItems,
} from "./checkoutSubmitOrders";
import {
  buildCheckoutResult,
  mergeCheckoutResults,
} from "./checkoutSubmitResult";

const UNKNOWN_ERROR_MESSAGE = "Неизвестная ошибка";
const UNKNOWN_PRODUCT_NAME = "Неизвестный товар";
const NETWORK_ERROR_MESSAGE = "Ошибка сети";

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
  const { getQuantity } = useCartQuantityStore();
  const { syncAfterSubmit, notifySubmitResult } =
    useCheckoutSubmitSideEffects({
      onSuccess,
      onPartialSuccess,
      onError,
    });

  const createOrderPayload = useCallback(
    (item: ProductBasket): OrderToCreate => {
      return buildOrderToCreate({
        item,
        quantity: getQuantity(item.product.id),
        addressId: checkoutState.selectedAddress?.id || 0,
        transferId: checkoutState.getTransferIdForSeller(item.product.sellerId),
        comment: checkoutState.comment,
      });
    },
    [checkoutState, getQuantity],
  );

  const submitSingleOrder = useCallback(
    async (order: OrderToCreate): Promise<OrderResult> => {
      try {
        await orderApi.createOrder([
          {
            productId: order.productId,
            count: order.count,
            addressId: order.addressId,
            transferId: order.transferId,
            comment: order.comment,
          },
        ]);

        return {
          productId: order.productId,
          productName: order.productName,
          status: "success",
        };
      } catch (error) {
        return {
          productId: order.productId,
          productName: order.productName,
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
        };
      }
    },
    [],
  );

  const executeOrders = useCallback(
    async (ordersToCreate: OrderToCreate[]): Promise<CheckoutResult> => {
      const results = await Promise.allSettled(
        ordersToCreate.map((order) => submitSingleOrder(order)),
      );

      return buildCheckoutResult(results, {
        totalCount: ordersToCreate.length,
        unknownProductName: UNKNOWN_PRODUCT_NAME,
        networkErrorMessage: NETWORK_ERROR_MESSAGE,
      });
    },
    [submitSingleOrder],
  );

  const handleSubmit = useCallback(async () => {
    if (!cartItems?.length || !checkoutState.isReadyToSubmit) {
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const ordersToCreate = cartItems.map(createOrderPayload);
      const checkoutResult = await executeOrders(ordersToCreate);

      setSubmitResult(checkoutResult);
      await syncAfterSubmit(checkoutResult.success);
      notifySubmitResult(checkoutResult);

      return checkoutResult;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    cartItems,
    checkoutState.isReadyToSubmit,
    createOrderPayload,
    executeOrders,
    syncAfterSubmit,
    notifySubmitResult,
  ]);

  const retryFailed = useCallback(async () => {
    if (!submitResult || submitResult.failed.length === 0) {
      return;
    }

    const failedItems = getFailedCartItems(cartItems, submitResult.failed);

    if (failedItems.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const retryOrders = failedItems.map(createOrderPayload);
      const retryResult = await executeOrders(retryOrders);
      const updatedResult = mergeCheckoutResults(submitResult, retryResult);

      setSubmitResult(updatedResult);
      await syncAfterSubmit(retryResult.success);
      notifySubmitResult(updatedResult);

      return updatedResult;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    submitResult,
    cartItems,
    createOrderPayload,
    executeOrders,
    syncAfterSubmit,
    notifySubmitResult,
  ]);

  return {
    handleSubmit,
    retryFailed,
    isSubmitting,
    submitResult,
    clearResult: () => setSubmitResult(null),
  };
};
