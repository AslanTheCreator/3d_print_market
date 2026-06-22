"use client";

import { useMemo } from "react";
import type { Address } from "@/shared/types";

interface UseCheckoutSubmitReadinessProps {
  selectedAddress: Address | null;
  selectedItemsCount: number;
  isDeliveryReady: boolean;
}

export const useCheckoutSubmitReadiness = ({
  selectedAddress,
  selectedItemsCount,
  isDeliveryReady,
}: UseCheckoutSubmitReadinessProps) => {
  return useMemo(() => {
    return (
      selectedAddress !== null && selectedItemsCount > 0 && isDeliveryReady
    );
  }, [isDeliveryReady, selectedAddress, selectedItemsCount]);
};
