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
  hasExternalOnlySelectedItems: boolean;
  hasPendingSelectedItems: boolean;
  hasNeedsValidationSelectedItems: boolean;
  hasInsufficientStockSelectedItems: boolean;
  isRefreshingCart: boolean;
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
  hasExternalOnlySelectedItems,
  hasPendingSelectedItems,
  hasNeedsValidationSelectedItems,
  hasInsufficientStockSelectedItems,
  isRefreshingCart,
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
        hasExternalOnlySelectedItems,
        hasPendingSelectedItems,
        hasNeedsValidationSelectedItems,
        hasInsufficientStockSelectedItems,
        isRefreshingCart,
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
      hasExternalOnlySelectedItems,
      hasPendingSelectedItems,
      hasNeedsValidationSelectedItems,
      hasInsufficientStockSelectedItems,
      isRefreshingCart,
      selectedAddress,
      selectedItemsCount,
    ],
  );
};
