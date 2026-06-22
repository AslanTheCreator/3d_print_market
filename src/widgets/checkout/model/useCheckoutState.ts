"use client";

import { useState } from "react";
import { ProductBasket } from "@/entities/cart";
import { useCheckoutAddress } from "./useCheckoutAddress";
import { useCheckoutDelivery } from "./useCheckoutDelivery";
import { useCheckoutSelection } from "./useCheckoutSelection";
import { useCheckoutSubmitReadiness } from "./useCheckoutSubmitReadiness";

interface UseCheckoutStateProps {
  cartItems: ProductBasket[] | undefined;
}

const EMPTY_CART_ITEMS: ProductBasket[] = [];

export const useCheckoutState = ({ cartItems }: UseCheckoutStateProps) => {
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

  const { isReadyToSubmit, submitBlockerMessage } =
    useCheckoutSubmitReadiness({
      selectedAddress,
      addressesCount: addresses.length,
      isLoadingAddresses,
      isAddressesError,
      selectedItemsCount: selectedItems.length,
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
    isAllSelected,
    toggleProductSelection,
    toggleSelectAll,
    ...checkoutDelivery,
    isReadyToSubmit,
    submitBlockerMessage,
  };
};

export type CheckoutState = ReturnType<typeof useCheckoutState>;
