"use client";

import { useState } from "react";
import { ProductBasket, useCartQuantityStore } from "@/entities/cart";
import { useCheckoutAddress } from "./useCheckoutAddress";
import { useCheckoutDelivery } from "./useCheckoutDelivery";
import { useCheckoutSelection } from "./useCheckoutSelection";
import { useCheckoutSubmitReadiness } from "./useCheckoutSubmitReadiness";

interface UseCheckoutStateProps {
  cartItems: ProductBasket[] | undefined;
  currentUserId: number | undefined;
  isLoadingCurrentUser: boolean;
  isCurrentUserError: boolean;
  isRefreshingCart: boolean;
  isCartValidationError: boolean;
}

const EMPTY_CART_ITEMS: ProductBasket[] = [];

export const useCheckoutState = ({
  cartItems,
  currentUserId,
  isLoadingCurrentUser,
  isCurrentUserError,
  isRefreshingCart,
  isCartValidationError,
}: UseCheckoutStateProps) => {
  const normalizedCartItems = cartItems ?? EMPTY_CART_ITEMS;
  const syncStates = useCartQuantityStore((state) => state.syncStates);
  const [comment, setComment] = useState<string>("");
  const {
    selectedAddress,
    setSelectedAddress,
    addresses,
    isLoadingAddresses,
    isAddressesError,
    refetchAddresses,
  } = useCheckoutAddress();
  const {
    selectedProductIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    toggleProductSelection,
    toggleSelectAll,
  } = useCheckoutSelection({ cartItems: normalizedCartItems });
  const checkoutDelivery = useCheckoutDelivery({
    cartItems: normalizedCartItems,
    selectedProductIds,
  });
  const hasOwnSelectedItems =
    currentUserId !== undefined &&
    selectedItems.some((item) => item.product.sellerId === currentUserId);
  const isCurrentUserUnavailable =
    isCurrentUserError || (!isLoadingCurrentUser && currentUserId === undefined);
  const hasPendingSelectedItems = selectedItems.some(
    (item) => syncStates[item.product.id]?.status === "pending",
  );
  const hasNeedsValidationSelectedItems =
    isCartValidationError ||
    selectedItems.some(
      (item) =>
        syncStates[item.product.id] === undefined ||
        syncStates[item.product.id].status === "needsValidation",
    );
  const hasInsufficientStockSelectedItems = selectedItems.some(
    (item) => item.enoughStock === false,
  );

  const { isReadyToSubmit, submitBlockerMessage } =
    useCheckoutSubmitReadiness({
      selectedAddress,
      addressesCount: addresses.length,
      isLoadingAddresses,
      isAddressesError,
      selectedItemsCount: selectedItems.length,
      isLoadingCurrentUser,
      isCurrentUserError: isCurrentUserUnavailable,
      hasOwnSelectedItems,
      hasPendingSelectedItems,
      hasNeedsValidationSelectedItems,
      hasInsufficientStockSelectedItems,
      isRefreshingCart,
      activeSellerGroups: checkoutDelivery.activeSellerGroups,
    });

  const canRetryStockValidation =
    selectedItems.length > 0 &&
    !isRefreshingCart &&
    !hasPendingSelectedItems &&
    hasNeedsValidationSelectedItems;

  return {
    selectedAddress,
    setSelectedAddress,
    addresses,
    isLoadingAddresses,
    isAddressesError,
    refetchAddresses,
    comment,
    setComment,
    selectedProductIds,
    selectedItems,
    selectedCount,
    hasOwnSelectedItems,
    isAllSelected,
    toggleProductSelection,
    toggleSelectAll,
    ...checkoutDelivery,
    isReadyToSubmit,
    submitBlockerMessage,
    canRetryStockValidation,
  };
};

export type CheckoutState = ReturnType<typeof useCheckoutState>;
