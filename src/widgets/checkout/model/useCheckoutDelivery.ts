"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { ShippingMethod } from "@/shared/types";
import { ProductBasket } from "@/entities/cart";
import { orderApi, orderQueryKeys } from "@/entities/order";
import { useDeliveryResolver } from "./useDeliveryResolver";

interface UseCheckoutDeliveryProps {
  selectedItems: ProductBasket[];
}

export const useCheckoutDelivery = ({
  selectedItems,
}: UseCheckoutDeliveryProps) => {
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] =
    useState<ShippingMethod | null>(null);

  const sellerProductMap = useMemo(() => {
    const map = new Map<number, number>();

    for (const item of selectedItems) {
      if (!map.has(item.product.sellerId)) {
        map.set(item.product.sellerId, item.product.id);
      }
    }

    return map;
  }, [selectedItems]);

  const sellerProductEntries = useMemo(() => {
    return Array.from(sellerProductMap.entries());
  }, [sellerProductMap]);

  const sellerQueries = useQueries({
    queries: sellerProductEntries.map(([, productId]) => ({
      queryKey: orderQueryKeys.orderData(productId),
      queryFn: () => orderApi.getOrderData(productId),
      enabled: !!productId,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const sellerTransfersData = useMemo(() => {
    return sellerProductEntries.map(([sellerId], index) => {
      const query = sellerQueries[index];

      return {
        sellerId,
        transfers: query?.data?.sellerTransfers || [],
        isLoading: query?.isLoading ?? true,
        isError: query?.isError ?? false,
      };
    });
  }, [sellerProductEntries, sellerQueries]);

  const deliveryResolution = useDeliveryResolver({
    cartItems: selectedItems,
    sellerTransfersData,
    selectedMethod: selectedDeliveryMethod,
  });

  const handleAutoSelectMethod = useCallback(() => {
    if (deliveryResolution.isLoading) {
      return;
    }

    const firstAvailableMethod = deliveryResolution.availableMethods[0] ?? null;

    if (!firstAvailableMethod) {
      if (selectedDeliveryMethod !== null) {
        setSelectedDeliveryMethod(null);
      }
      return;
    }

    if (
      selectedDeliveryMethod === null ||
      !deliveryResolution.availableMethods.includes(selectedDeliveryMethod)
    ) {
      setSelectedDeliveryMethod(firstAvailableMethod);
    }
  }, [
    selectedDeliveryMethod,
    deliveryResolution.availableMethods,
    deliveryResolution.isLoading,
  ]);

  useEffect(() => {
    handleAutoSelectMethod();
  }, [handleAutoSelectMethod]);

  const getTransferIdForSeller = useCallback(
    (sellerId: number): number | null => {
      const info = deliveryResolution.sellerDeliveryInfo.get(sellerId);
      return info?.selectedTransfer?.id || null;
    },
    [deliveryResolution.sellerDeliveryInfo],
  );

  return {
    sellerQueries,
    selectedDeliveryMethod,
    setSelectedDeliveryMethod,
    availableDeliveryMethods: deliveryResolution.availableMethods,
    deliveryResolution,
    getTransferIdForSeller,
    isLoadingDelivery: deliveryResolution.isLoading,
    isDeliveryError: deliveryResolution.isError,
  };
};
