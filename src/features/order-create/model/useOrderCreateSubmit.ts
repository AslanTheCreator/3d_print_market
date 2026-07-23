"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  cartKeys,
  type ProductBasket,
  useCartQuantityStore,
} from "@/entities/cart";
import { orderApi } from "@/entities/order";
import { buildOrderToCreate, getFailedOrders } from "./orderCreatePayload";
import {
  buildCheckoutResult,
  mergeCheckoutResults,
} from "./orderCreateResult";
import { useOrderCreateSideEffects } from "./useOrderCreateSideEffects";
import type {
  CheckoutResult,
  OrderResult,
  OrderToCreate,
  UseOrderCreateSubmitProps,
} from "./types";

const UNKNOWN_ERROR_MESSAGE = "Неизвестная ошибка";
const UNKNOWN_PRODUCT_NAME = "Неизвестный товар";
const NETWORK_ERROR_MESSAGE = "Ошибка сети";

export const useOrderCreateSubmit = ({
  cartItems,
  checkoutState,
  onSuccess,
  onPartialSuccess,
  onError,
}: UseOrderCreateSubmitProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<CheckoutResult | null>(null);
  const isSubmittingRef = useRef(false);
  const failedOrdersRef = useRef<OrderToCreate[]>([]);
  const queryClient = useQueryClient();
  const { getQuantity } = useCartQuantityStore();
  const { syncAfterSubmit, notifySubmitResult } = useOrderCreateSideEffects({
    onSuccess,
    onPartialSuccess,
    onError,
  });

  const canSubmitProducts = useCallback(
    (productIds: number[], fallbackItems: ProductBasket[]) => {
      const quantityState = useCartQuantityStore.getState();
      const localProductIds = new Set(
        quantityState.items.map((item) => item.productId),
      );

      if (
        productIds.some(
          (productId) =>
            !localProductIds.has(productId) ||
            quantityState.syncStates[productId] === undefined ||
            quantityState.getSyncStatus(productId) !== "synced",
        )
      ) {
        return false;
      }

      const cartQueryState = queryClient.getQueryState(cartKeys.all);

      if (
        cartQueryState?.fetchStatus === "fetching" ||
        cartQueryState?.status === "error"
      ) {
        return false;
      }

      const latestCartItems = queryClient.getQueryData<ProductBasket[]>(
        cartKeys.all,
      );
      const latestItemsById = latestCartItems
        ? new Map(
            latestCartItems.map((item) => [item.product.id, item] as const),
          )
        : null;
      const fallbackItemsById = new Map(
        fallbackItems.map((item) => [item.product.id, item] as const),
      );

      return productIds.every((productId) => {
        const latestItem = latestItemsById
          ? latestItemsById.get(productId)
          : fallbackItemsById.get(productId);

        return latestItem !== undefined && latestItem.enoughStock !== false;
      });
    },
    [queryClient],
  );

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
    const selectedCartItems = cartItems ?? [];
    const selectedProductIds = selectedCartItems.map(
      (item) => item.product.id,
    );

    if (
      isSubmittingRef.current ||
      selectedCartItems.length === 0 ||
      !checkoutState.isReadyToSubmit ||
      !canSubmitProducts(selectedProductIds, selectedCartItems)
    ) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const ordersToCreate = selectedCartItems.map(createOrderPayload);
      const checkoutResult = await executeOrders(ordersToCreate);

      failedOrdersRef.current = getFailedOrders(
        ordersToCreate,
        checkoutResult.failed,
      );
      setSubmitResult(checkoutResult);
      await syncAfterSubmit(checkoutResult.success);
      notifySubmitResult(checkoutResult);

      return checkoutResult;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    cartItems,
    canSubmitProducts,
    checkoutState.isReadyToSubmit,
    createOrderPayload,
    executeOrders,
    syncAfterSubmit,
    notifySubmitResult,
  ]);

  const retryFailed = useCallback(async () => {
    if (
      isSubmittingRef.current ||
      !submitResult ||
      submitResult.failed.length === 0
    ) {
      return;
    }

    const retryOrders = failedOrdersRef.current;

    const retryProductIds = retryOrders.map((order) => order.productId);
    const fallbackItems = cartItems ?? [];

    if (
      retryOrders.length === 0 ||
      !canSubmitProducts(retryProductIds, fallbackItems)
    ) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const retryResult = await executeOrders(retryOrders);
      const updatedResult = mergeCheckoutResults(submitResult, retryResult);

      failedOrdersRef.current = getFailedOrders(
        retryOrders,
        retryResult.failed,
      );
      setSubmitResult(updatedResult);
      await syncAfterSubmit(retryResult.success);
      notifySubmitResult(updatedResult);

      return updatedResult;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    submitResult,
    cartItems,
    canSubmitProducts,
    executeOrders,
    syncAfterSubmit,
    notifySubmitResult,
  ]);

  const clearResult = useCallback(() => {
    failedOrdersRef.current = [];
    setSubmitResult(null);
  }, []);

  return {
    handleSubmit,
    retryFailed,
    isSubmitting,
    submitResult,
    clearResult,
  };
};
