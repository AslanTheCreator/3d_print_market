"use client";

import { usePrivateScope } from "@/shared/lib/query";
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
  const scope = usePrivateScope();
  const queryClient = useQueryClient();
  const { removeItem: removeQuantityItem } = useCartQuantityStore();

  const syncAfterSubmit = useCallback(
    async (successOrders: OrderResult[]) => {
      if (!scope.isCurrent()) return;
      for (const order of successOrders) {
        removeQuantityItem(order.productId);
      }

      await queryClient.invalidateQueries({ queryKey: scope.key(cartKeys.all) });
      await queryClient.invalidateQueries({
        queryKey: scope.key(orderQueryKeys.customerOrders()),
      });
    },
    [scope, queryClient, removeQuantityItem],
  );

  const notifySubmitResult = useCallback(
    (result: CheckoutResult) => {
      if (!scope.isCurrent()) return;
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
    [scope, onSuccess, onPartialSuccess, onError],
  );

  return {
    syncAfterSubmit,
    notifySubmitResult,
  };
};
