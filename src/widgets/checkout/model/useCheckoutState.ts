"use client";

import { useState } from "react";
import { ProductBasket } from "@/entities/cart";
import { useCheckoutAddress } from "./useCheckoutAddress";
import { useCheckoutDelivery } from "./useCheckoutDelivery";
import { useCheckoutSelection } from "./useCheckoutSelection";
import { useCheckoutSubmitReadiness } from "./useCheckoutSubmitReadiness";

interface UseCheckoutStateProps {
  cartItems: ProductBasket[] | undefined;
  currentUserId: number | undefined;
  isLoadingCurrentUser: boolean;
  isCurrentUserError: boolean;
}

const EMPTY_CART_ITEMS: ProductBasket[] = [];

export const useCheckoutState = ({
  cartItems,
  currentUserId,
  isLoadingCurrentUser,
  isCurrentUserError,
}: UseCheckoutStateProps) => {
  const normalizedCartItems = cartItems ?? EMPTY_CART_ITEMS;
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
      activeSellerGroups: checkoutDelivery.activeSellerGroups,
    });

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
  };
};

export type CheckoutState = ReturnType<typeof useCheckoutState>;
