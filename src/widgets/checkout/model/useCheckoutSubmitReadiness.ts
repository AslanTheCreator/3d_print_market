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
  isLoadingCurrentUser: boolean;
  isCurrentUserError: boolean;
  hasOwnSelectedItems: boolean;
  activeSellerGroups: SellerCheckoutGroup[];
}

export const useCheckoutSubmitReadiness = ({
  selectedAddress,
  addressesCount,
  isLoadingAddresses,
  isAddressesError,
  selectedItemsCount,
  isLoadingCurrentUser,
  isCurrentUserError,
  hasOwnSelectedItems,
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
        isLoadingCurrentUser,
        isCurrentUserError,
        hasOwnSelectedItems,
        activeSellerGroups,
      }),
    [
      activeSellerGroups,
      addressesCount,
      isAddressesError,
      isLoadingAddresses,
      isLoadingCurrentUser,
      isCurrentUserError,
      hasOwnSelectedItems,
      selectedAddress,
      selectedItemsCount,
    ],
  );
};
