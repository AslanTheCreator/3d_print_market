"use client";

import { usePrivateScope } from "@/shared/lib/query";
import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import { getCheckoutAttempt, isConfirmedOrderRejection } from "./checkoutAttempt";
import {
  cartKeys,
  type ProductBasket,
  useCartQuantityStore,
} from "@/entities/cart";
import { orderApi } from "@/entities/order";
import { productKeys } from "@/entities/product";
import { ErrorCodes } from "@/shared/lib/errorHandler";
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
const NON_PURCHASABLE_PRODUCT_ERROR_MESSAGE =
  "Этот товар сейчас недоступен для покупки";

interface ProductSubmissionCheck {
  canSubmit: boolean;
}

export const useOrderCreateSubmit = ({
  cartItems,
  checkoutState,
  onSuccess,
  onPartialSuccess,
  onError,
}: UseOrderCreateSubmitProps) => {
  const scope = usePrivateScope();
  const attempt = getCheckoutAttempt(scope.signal);
  const { pending: isSubmitting, uncertain: hasUncertainOrders } = useStore(attempt);
  const [submitResult, setSubmitResult] = useState<CheckoutResult | null>(null);
  const resultRef = useRef<CheckoutResult | null>(null);
  const selectionRef = useRef<number[]>([]);
  const successfulIds = useRef(new Set<number>());
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
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
      const cartQueryState = queryClient.getQueryState(scope.key(cartKeys.all));

      if (
        cartQueryState?.fetchStatus === "fetching" ||
        cartQueryState?.status === "error"
      ) {
        return { canSubmit: false };
      }

      const latestCartItems = queryClient.getQueryData<ProductBasket[]>(
        scope.key(cartKeys.all),
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
        return { canSubmit: false };
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
        return { canSubmit: false };
      }

      return {
        canSubmit: resolvedItems.every(
          (item) => item !== undefined && item.enoughStock !== false &&
            item.count === quantityState.getQuantity(item.product.id) &&
            Number.isSafeInteger(item.count) && item.count > 0,
        ),
      };
    },
    [scope, queryClient],
  );

  const refreshNonPurchasableProducts = useCallback(
    async (productIds: readonly number[]) => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: scope.key(cartKeys.all) }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        ...productIds.map((productId) =>
          queryClient.invalidateQueries({
            queryKey: productKeys.detail(productId),
          }),
        ),
      ]);
    },
    [scope, queryClient],
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
      if (!scope.isCurrent()) throw new Error("Session ended");
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
          isConfirmedOrderRejection(error) &&
          error.isCode(ErrorCodes.PRODUCT_NOT_PURCHASABLE)
        ) {
          await refreshNonPurchasableProducts([order.productId]);

          return {
            productId: order.productId,
            productName: order.productName,
            status: "error",
            errorCode: ErrorCodes.PRODUCT_NOT_PURCHASABLE,
            errorMessage: NON_PURCHASABLE_PRODUCT_ERROR_MESSAGE,
            retryable: false,
          };
        }

        return {
          productId: order.productId,
          productName: order.productName,
          status: isConfirmedOrderRejection(error) ? "error" : "unknown",
          retryable: isConfirmedOrderRejection(error),
          errorMessage:
            error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
        };
      }
    },
    [refreshNonPurchasableProducts, scope],
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
        orders: ordersToCreate,
      });
    },
    [submitSingleOrder],
  );

  const handleSubmit = useCallback(async () => {
    const selectedCartItems = (cartItems ?? []).filter(item => !successfulIds.current.has(item.product.id));
    const selectedProductIds = selectedCartItems.map(
      (item) => item.product.id,
    );

    const submissionCheck = checkProductsForSubmission(
      selectedProductIds,
      selectedCartItems,
    );

    if (
      !scope.isCurrent() || attempt.getState().pending || attempt.getState().uncertain ||
      selectedCartItems.length === 0 ||
      !checkoutState.isReadyToSubmit ||
      !submissionCheck.canSubmit
    ) {
      return;
    }

    attempt.setState({ pending: true });
    selectionRef.current = selectedProductIds;
    setRetryMessage(null);
    setSubmitResult(null);

    try {
      const ordersToCreate = selectedCartItems.map(createOrderPayload);
      const checkoutResult = await executeOrders(ordersToCreate);
      if (!scope.isCurrent()) return;
      attempt.setState({ uncertain: checkoutResult.failed.some(item => item.status === "unknown") });
      checkoutResult.success.forEach(item => successfulIds.current.add(item.productId));
      resultRef.current = checkoutResult;

      failedOrdersRef.current = getFailedOrders(
        ordersToCreate,
        checkoutResult.failed,
      );
      setSubmitResult(checkoutResult);
      await syncAfterSubmit(checkoutResult.success);
      notifySubmitResult(checkoutResult);

      return checkoutResult;
    } finally {
      attempt.setState({ pending: false });
    }
  }, [
    attempt,
    scope,
    cartItems,
    checkProductsForSubmission,
    checkoutState.isReadyToSubmit,
    createOrderPayload,
    executeOrders,
    syncAfterSubmit,
    notifySubmitResult,
  ]);

  const retryFailed = useCallback(async () => {
    const resultBeforeRetry = resultRef.current;
    if (
      !scope.isCurrent() || attempt.getState().pending || attempt.getState().uncertain ||
      !resultBeforeRetry ||
      resultBeforeRetry.failed.length === 0
    ) {
      return;
    }

    const retryOrders = failedOrdersRef.current;
    const retryProductIds = retryOrders.map((order) => order.productId);
    const fallbackItems = cartItems ?? [];

    const submissionCheck = checkProductsForSubmission(
      retryProductIds,
      fallbackItems,
    );

    const selectedItems = fallbackItems.filter(item => !successfulIds.current.has(item.product.id));
    const expectedSelection = selectionRef.current.filter(id => !successfulIds.current.has(id));
    const unchanged = selectedItems.length === expectedSelection.length &&
      selectedItems.every(item => expectedSelection.includes(item.product.id)) &&
      retryOrders.every(order => {
        const item = selectedItems.find(item => item.product.id === order.productId);
        if (!item) return false;
        const current = createOrderPayload(item);
        return current.count === order.count && current.addressId === order.addressId &&
          current.transferId === order.transferId && current.comment === order.comment;
      });
    if (retryOrders.length === 0) return resultBeforeRetry;
    if (!checkoutState.isReadyToSubmit || !submissionCheck.canSubmit || !unchanged) {
      failedOrdersRef.current = [];
      const staleResult = { ...resultBeforeRetry, failed: resultBeforeRetry.failed.map(item => ({ ...item, retryable: false })) };
      resultRef.current = staleResult;
      setSubmitResult(staleResult);
      setRetryMessage("Параметры заказа изменились или ещё не проверены. Вернитесь к оформлению и проверьте товары, адрес и доставку.");
      return resultBeforeRetry;
    }

    attempt.setState({ pending: true });

    try {
      const retryResult = await executeOrders(retryOrders);
      if (!scope.isCurrent()) return;
      attempt.setState({ uncertain: retryResult.failed.some(item => item.status === "unknown") });
      retryResult.success.forEach(item => successfulIds.current.add(item.productId));
      const updatedResult = mergeCheckoutResults(
        resultBeforeRetry,
        retryResult,
      );

      failedOrdersRef.current = getFailedOrders(
        retryOrders,
        retryResult.failed,
      );
      resultRef.current = updatedResult;
      setSubmitResult(updatedResult);
      await syncAfterSubmit(retryResult.success);
      notifySubmitResult(updatedResult);

      return updatedResult;
    } finally {
      attempt.setState({ pending: false });
    }
  }, [
    attempt,
    scope,
    checkoutState,
    createOrderPayload,
    cartItems,
    checkProductsForSubmission,
    executeOrders,
    syncAfterSubmit,
    notifySubmitResult,
  ]);

  const clearResult = useCallback(() => {
    failedOrdersRef.current = [];
    resultRef.current = null;
    setRetryMessage(null);
    setSubmitResult(null);
  }, []);

  return {
    handleSubmit,
    retryFailed,
    isSubmitting,
    submitResult,
    clearResult,
    hasUncertainOrders,
    retryMessage,
  };
};
