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
import { buildOrderToCreate, getFailedOrders, hasCreatedOrderIds, toOrderRequest } from "./orderCreatePayload";
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
    (item: ProductBasket): OrderToCreate | null => {
      return buildOrderToCreate({
        item,
        quantity: getQuantity(item.product.id),
        addressId: checkoutState.selectedAddress?.id,
        transferId: checkoutState.getTransferIdForSeller(item.product.sellerId),
        comment: checkoutState.comment,
        carrierDelivery: checkoutState.carrierDelivery,
      });
    },
    [checkoutState, getQuantity],
  );

  const submitOrderBatch = useCallback(
    async (orders: OrderToCreate[]): Promise<{ positions: OrderResult[]; batchError?: string }> => {
      if (!scope.isCurrent()) throw new Error("Session ended");
      const positions = orders.map(({ productId, productName }) => ({ productId, productName }));
      try {
        const response = await orderApi.createOrder(orders.map(toOrderRequest));
        if (!hasCreatedOrderIds(response, orders.length)) {
          return { positions: positions.map(position => ({
            ...position,
            status: "unknown",
            errorMessage: "Сервер не подтвердил создание всех заказов. Проверьте покупки.",
          })) };
        }
        return { positions: positions.map(position => ({ ...position, status: "success" })) };
      } catch (error) {
        const rejected = isConfirmedOrderRejection(error);
        const unavailable = rejected && error.isCode(ErrorCodes.PRODUCT_NOT_PURCHASABLE);
        const insufficientStock = rejected && (error.isCode("OUT_OF_STOCK") || error.isCode("NOT_ENOUGH_STOCK"));
        if (scope.isCurrent() && (unavailable || insufficientStock)) {
          await refreshNonPurchasableProducts(positions.map(position => position.productId));
        }
        // A batch error does not identify the affected positions or confirm a rollback.
        if (orders.length > 1) {
          return {
            batchError: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
            positions: positions.map(position => ({ ...position, status: "unknown" })),
          };
        }
        return { positions: positions.map(position => ({
          ...position,
          status: rejected ? "error" : "unknown",
          retryable: rejected && !unavailable && !insufficientStock,
          errorCode: rejected ? error.code : undefined,
          errorMessage: unavailable ? NON_PURCHASABLE_PRODUCT_ERROR_MESSAGE
            : error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
        })) };
      }
    },
    [refreshNonPurchasableProducts, scope],
  );

  const executeOrders = useCallback(
    async (ordersToCreate: OrderToCreate[]): Promise<CheckoutResult> => {
      const cart = useCartQuantityStore.getState();
      for (const order of ordersToCreate) cart.beginCheckout(order.productId, order.productName);
      const batches = ordersToCreate[0]?.deliveryCarrier
        ? [ordersToCreate]
        : ordersToCreate.map(order => [order]);
      const results = await Promise.allSettled(batches.map(submitOrderBatch));
      const positions = results.flatMap<PromiseSettledResult<OrderResult>>((result, index) =>
        result.status === "fulfilled"
          ? result.value.positions.map(value => ({ status: "fulfilled", value }))
          : batches[index].map(() => result),
      );

      const result = buildCheckoutResult(positions, {
        totalCount: ordersToCreate.length,
        unknownProductName: UNKNOWN_PRODUCT_NAME,
        networkErrorMessage: NETWORK_ERROR_MESSAGE,
        orders: ordersToCreate,
      });
      const batch = results[0];
      if (batch?.status === "fulfilled" && batch.value.batchError) result.batchError = batch.value.batchError;
      if (!scope.isCurrent()) return result;
      attempt.setState({ uncertain: result.failed.some(item => item.status === "unknown") });
      await syncAfterSubmit();
      if (!scope.isCurrent()) return result;
      for (const item of result.failed) cart.finishCheckout(item.productId, false);
      for (const item of result.success) {
        if (cart.finishCheckout(item.productId, true)) successfulIds.current.add(item.productId);
        else item.cartItemChanged = true;
      }
      return result;
    },
    [attempt, scope, submitOrderBatch, syncAfterSubmit],
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
      const ordersToCreate = selectedCartItems.map(createOrderPayload).filter(order => order !== null);
      if (ordersToCreate.length !== selectedCartItems.length) return;
      const checkoutResult = await executeOrders(ordersToCreate);
      if (!scope.isCurrent()) return;
      resultRef.current = checkoutResult;

      failedOrdersRef.current = getFailedOrders(
        ordersToCreate,
        checkoutResult.failed,
      );
      setSubmitResult(checkoutResult);
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
        return current !== null && current.count === order.count && current.addressId === order.addressId &&
          current.transferId === order.transferId && current.comment === order.comment &&
          current.deliveryCarrier === order.deliveryCarrier && current.deliveryAddress === order.deliveryAddress;
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
