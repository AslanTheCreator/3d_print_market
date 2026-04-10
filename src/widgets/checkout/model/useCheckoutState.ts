"use client";

import { useState, useMemo } from "react";
import { ProductBasket } from "@/entities/cart";
import { useCheckoutAddress } from "./useCheckoutAddress";
import { useCheckoutDelivery } from "./useCheckoutDelivery";
import { useCheckoutDeliveryErrorMessage } from "./useCheckoutDeliveryErrorMessage";
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
  const {
    sellerQueries,
    selectedDeliveryMethod,
    setSelectedDeliveryMethod,
    availableDeliveryMethods,
    deliveryResolution,
    getTransferIdForSeller,
    isLoadingDelivery,
    isDeliveryError,
  } = useCheckoutDelivery({ selectedItems });

  const deliveryErrorMessage = useCheckoutDeliveryErrorMessage({
    sellerQueries,
    fallbackMessage: "Не удалось загрузить способы доставки",
  });

  const selectedTransfersCount = useMemo(() => {
    return [...deliveryResolution.sellerDeliveryInfo.values()].filter(
      (info) => info.selectedTransfer !== null,
    ).length;
  }, [deliveryResolution.sellerDeliveryInfo]);

  const isReadyToSubmit = useCheckoutSubmitReadiness({
    selectedAddress,
    selectedDeliveryMethod,
    selectedItemsCount: selectedItems.length,
    isLoadingDelivery,
    selectedTransfersCount,
    sellersCount: deliveryResolution.sellerDeliveryInfo.size,
  });

  return {
    selectedAddress,
    setSelectedAddress,
    addresses,
    isLoadingAddresses,
    isAddressesError,
    refetchAddresses,
    selectedDeliveryMethod,
    setSelectedDeliveryMethod,
    availableDeliveryMethods,
    comment,
    setComment,
    selectedProductIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    toggleProductSelection,
    toggleSelectAll,
    deliveryResolution,
    getTransferIdForSeller,
    isLoadingDelivery,
    isDeliveryError,
    deliveryErrorMessage,
    isReadyToSubmit,
  };
};

export type CheckoutState = ReturnType<typeof useCheckoutState>;
