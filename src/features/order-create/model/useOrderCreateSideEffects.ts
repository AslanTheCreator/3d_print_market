"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cartKeys, useCartQuantityStore } from "@/entities/cart";
import { orderQueryKeys } from "@/entities/order";
import type { CheckoutResult, OrderResult } from "./types";

interface UseOrderCreateSideEffectsProps {
  onSuccess: (result: CheckoutResult) => void;
  onPartialSuccess: (result: CheckoutResult) => void;
  onError: (result: CheckoutResult) => void;
}

export const useOrderCreateSideEffects = ({
  onSuccess,
  onPartialSuccess,
  onError,
}: UseOrderCreateSideEffectsProps) => {
  const queryClient = useQueryClient();
  const { removeItem: removeQuantityItem } = useCartQuantityStore();

  const syncAfterSubmit = useCallback(
    async (successOrders: OrderResult[]) => {
      for (const order of successOrders) {
        removeQuantityItem(order.productId);
      }

      await queryClient.invalidateQueries({ queryKey: cartKeys.all });
      await queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });
    },
    [queryClient, removeQuantityItem],
  );

  const notifySubmitResult = useCallback(
    (result: CheckoutResult) => {
      if (result.successCount === result.totalCount) {
        onSuccess(result);
        return;
      }

      if (result.successCount > 0) {
        onPartialSuccess(result);
        return;
      }

      onError(result);
    },
    [onSuccess, onPartialSuccess, onError],
  );

  return {
    syncAfterSubmit,
    notifySubmitResult,
  };
};
