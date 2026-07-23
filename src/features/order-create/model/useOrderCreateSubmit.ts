"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  cartKeys,
  type ProductBasket,
  useCartQuantityStore,
} from "@/entities/cart";
import { orderApi } from "@/entities/order";
import { productKeys } from "@/entities/product";
import { ApiError, ErrorCodes } from "@/shared/lib/errorHandler";
import { buildOrderToCreate, getFailedOrders } from "./orderCreatePayload";
import {
  buildCheckoutResult,
  markFailedOrdersNonRetryable,
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
const EXTERNAL_PRODUCT_ERROR_MESSAGE =
  "Этот товар можно приобрести только через Telegram";

interface ProductSubmissionCheck {
  canSubmit: boolean;
  externalProductIds: number[];
}

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

  const checkProductsForSubmission = useCallback(
    (
      productIds: number[],
      fallbackItems: ProductBasket[],
    ): ProductSubmissionCheck => {
      const cartQueryState = queryClient.getQueryState(cartKeys.all);

      if (
        cartQueryState?.fetchStatus === "fetching" ||
        cartQueryState?.status === "error"
      ) {
        return { canSubmit: false, externalProductIds: [] };
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
      const resolvedItems = productIds.map((productId) =>
        latestItemsById
          ? latestItemsById.get(productId)
          : fallbackItemsById.get(productId),
      );

      if (resolvedItems.some((item) => item === undefined)) {
        return { canSubmit: false, externalProductIds: [] };
      }

      const externalProductIds = resolvedItems.flatMap((item) =>
        item?.product.availability === "EXTERNAL_ONLY"
          ? [item.product.id]
          : [],
      );

      if (externalProductIds.length > 0) {
        return { canSubmit: false, externalProductIds };
      }

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
        return { canSubmit: false, externalProductIds: [] };
      }

      return {
        canSubmit: resolvedItems.every(
          (item) => item !== undefined && item.enoughStock !== false,
        ),
        externalProductIds: [],
      };
    },
    [queryClient],
  );

  const refreshNonPurchasableProducts = useCallback(
    async (productIds: readonly number[]) => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: cartKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        ...productIds.map((productId) =>
          queryClient.invalidateQueries({
            queryKey: productKeys.detail(productId),
          }),
        ),
      ]);
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
        if (
          error instanceof ApiError &&
          error.isCode(ErrorCodes.PRODUCT_NOT_PURCHASABLE)
        ) {
          await refreshNonPurchasableProducts([order.productId]);

          return {
            productId: order.productId,
            productName: order.productName,
            status: "error",
            errorCode: ErrorCodes.PRODUCT_NOT_PURCHASABLE,
            errorMessage: EXTERNAL_PRODUCT_ERROR_MESSAGE,
            retryable: false,
          };
        }

        return {
          productId: order.productId,
          productName: order.productName,
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
        };
      }
    },
    [refreshNonPurchasableProducts],
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

    const submissionCheck = checkProductsForSubmission(
      selectedProductIds,
      selectedCartItems,
    );

    if (
      isSubmittingRef.current ||
      selectedCartItems.length === 0 ||
      !checkoutState.isReadyToSubmit ||
      !submissionCheck.canSubmit
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
    checkProductsForSubmission,
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

    let retryOrders = failedOrdersRef.current;
    let resultBeforeRetry = submitResult;
    const retryProductIds = retryOrders.map((order) => order.productId);
    const fallbackItems = cartItems ?? [];

    let submissionCheck = checkProductsForSubmission(
      retryProductIds,
      fallbackItems,
    );

    if (submissionCheck.externalProductIds.length > 0) {
      const externalProductIds = new Set(
        submissionCheck.externalProductIds,
      );
      resultBeforeRetry = markFailedOrdersNonRetryable(
        resultBeforeRetry,
        externalProductIds,
        ErrorCodes.PRODUCT_NOT_PURCHASABLE,
        EXTERNAL_PRODUCT_ERROR_MESSAGE,
      );

      retryOrders = retryOrders.filter(
        (order) => !externalProductIds.has(order.productId),
      );
      failedOrdersRef.current = retryOrders;
      setSubmitResult(resultBeforeRetry);
      await refreshNonPurchasableProducts(
        submissionCheck.externalProductIds,
      );

      submissionCheck = checkProductsForSubmission(
        retryOrders.map((order) => order.productId),
        fallbackItems,
      );
    }

    if (retryOrders.length === 0 || !submissionCheck.canSubmit) {
      return resultBeforeRetry;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const retryResult = await executeOrders(retryOrders);
      const updatedResult = mergeCheckoutResults(
        resultBeforeRetry,
        retryResult,
      );

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
    checkProductsForSubmission,
    executeOrders,
    refreshNonPurchasableProducts,
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
