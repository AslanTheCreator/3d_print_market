"use client";

import { useState } from "react";
import { ProductBasket, useCartQuantityStore } from "@/entities/cart";
import { getDeliveryFieldErrors, type DeliveryCarrier } from "@/entities/order";
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
  const [deliveryMode, setDeliveryMode] = useState<"legacy" | "carrier">("legacy");
  const [deliveryCarrier, setDeliveryCarrier] = useState<DeliveryCarrier | "">("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const usesCarrier = deliveryMode === "carrier";
  const deliveryErrors = getDeliveryFieldErrors(deliveryCarrier, deliveryAddress);
  const carrierDeliveryError = usesCarrier ? deliveryErrors.carrier ?? deliveryErrors.address : undefined;
  const {
    selectedAddress,
    setSelectedAddress,
    addresses,
    isLoadingAddresses,
    isAddressesError,
    refetchAddresses,
    addressCreation,
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
    enabled: !usesCarrier,
  });
  const orderableSelectedItems = selectedItems;
  const hasOwnSelectedItems =
    currentUserId !== undefined &&
    orderableSelectedItems.some(
      (item) => item.product.sellerId === currentUserId,
    );
  const isCurrentUserUnavailable =
    isCurrentUserError || (!isLoadingCurrentUser && currentUserId === undefined);
  const hasPendingSelectedItems = orderableSelectedItems.some(
    (item) => syncStates[item.product.id]?.status === "pending",
  );
  const hasNeedsValidationSelectedItems =
    (isCartValidationError && orderableSelectedItems.length > 0) ||
    orderableSelectedItems.some(
      (item) =>
        syncStates[item.product.id] === undefined ||
        syncStates[item.product.id].status === "needsValidation",
    );
  const hasInsufficientStockSelectedItems = orderableSelectedItems.some(
    (item) => item.enoughStock === false,
  );

  const { isReadyToSubmit, submitBlockerMessage } =
    useCheckoutSubmitReadiness({
      selectedAddress,
      addressesCount: addresses.length,
      isLoadingAddresses,
      isAddressesError,
      isAddressCreationOpen: addressCreation.isOpen,
      selectedItemsCount: selectedItems.length,
      isLoadingCurrentUser,
      isCurrentUserError: isCurrentUserUnavailable,
      hasOwnSelectedItems,
      hasPendingSelectedItems,
      hasNeedsValidationSelectedItems,
      hasInsufficientStockSelectedItems,
      isRefreshingCart:
        isRefreshingCart && orderableSelectedItems.length > 0,
      activeSellerGroups: checkoutDelivery.activeSellerGroups,
      carrierDeliveryError,
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
    addressCreation,
    deliveryMode,
    setDeliveryMode,
    deliveryCarrier,
    setDeliveryCarrier,
    deliveryAddress,
    setDeliveryAddress,
    deliveryErrors,
    carrierDelivery: usesCarrier ? { deliveryCarrier, deliveryAddress } : undefined,
    comment,
    setComment,
    selectedProductIds,
    selectedItems,
    orderableSelectedItems,
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
