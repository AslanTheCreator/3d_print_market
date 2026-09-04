"use client";

import { useMemo } from "react";
import type { Address } from "@/entities/address";
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
  isAddressCreationOpen: boolean;
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
  isAddressCreationOpen,
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
        isAddressCreationOpen,
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
      isAddressCreationOpen,
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
