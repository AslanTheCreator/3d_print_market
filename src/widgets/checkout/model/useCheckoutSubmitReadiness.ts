"use client";

import { useMemo } from "react";
import type { Address } from "@/shared/types";
import {
  getCheckoutSubmitReadiness,
  type CheckoutSubmitReadiness,
} from "./checkoutSubmitReadiness";
import type { SellerCheckoutGroup } from "./types";

interface UseCheckoutSubmitReadinessProps {
  selectedAddress: Address | null;
  addressesCount: number;
  isLoadingAddresses: boolean;
  isAddressesError: boolean;
  selectedItemsCount: number;
  activeSellerGroups: SellerCheckoutGroup[];
}

export const useCheckoutSubmitReadiness = ({
  selectedAddress,
  addressesCount,
  isLoadingAddresses,
  isAddressesError,
  selectedItemsCount,
  activeSellerGroups,
}: UseCheckoutSubmitReadinessProps): CheckoutSubmitReadiness => {
  return useMemo(
    () =>
      getCheckoutSubmitReadiness({
        selectedAddress,
        addressesCount,
        isLoadingAddresses,
        isAddressesError,
        selectedItemsCount,
        activeSellerGroups,
      }),
    [
      activeSellerGroups,
      addressesCount,
      isAddressesError,
      isLoadingAddresses,
      selectedAddress,
      selectedItemsCount,
    ],
  );
};
