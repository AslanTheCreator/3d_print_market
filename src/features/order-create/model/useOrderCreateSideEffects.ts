"use client";

import { usePrivateScope } from "@/shared/lib/query";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cartKeys } from "@/entities/cart";
import { orderQueryKeys } from "@/entities/order";
import type { CheckoutResult } from "./types";

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

  const syncAfterSubmit = useCallback(
    async () => {
      if (!scope.isCurrent()) return;
      await queryClient.invalidateQueries({ queryKey: scope.key(cartKeys.all) });
      if (!scope.isCurrent()) return;
      await queryClient.invalidateQueries({
        queryKey: scope.key(orderQueryKeys.customerOrders()),
      });
    },
    [scope, queryClient],
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
