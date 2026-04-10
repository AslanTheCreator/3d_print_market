"use client";

import { useMemo } from "react";
import { Address, ShippingMethod } from "@/shared/types";

interface UseCheckoutSubmitReadinessProps {
  selectedAddress: Address | null;
  selectedDeliveryMethod: ShippingMethod | null;
  selectedItemsCount: number;
  isLoadingDelivery: boolean;
  selectedTransfersCount: number;
  sellersCount: number;
}

export const useCheckoutSubmitReadiness = ({
  selectedAddress,
  selectedDeliveryMethod,
  selectedItemsCount,
  isLoadingDelivery,
  selectedTransfersCount,
  sellersCount,
}: UseCheckoutSubmitReadinessProps) => {
  return useMemo(() => {
    return (
      selectedAddress !== null &&
      selectedDeliveryMethod !== null &&
      selectedItemsCount > 0 &&
      !isLoadingDelivery &&
      selectedTransfersCount === sellersCount
    );
  }, [
    selectedAddress,
    selectedDeliveryMethod,
    selectedItemsCount,
    isLoadingDelivery,
    selectedTransfersCount,
    sellersCount,
  ]);
};
