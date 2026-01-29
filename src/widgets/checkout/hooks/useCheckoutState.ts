"use client";

import { useState, useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Address } from "@/entities/address/model/types";
import { ShippingMethod } from "@/entities/transfer/model/types";
import { ProductBasket } from "@/entities/cart";
import { orderApi } from "@/entities/order/api/orderApi";
import { orderQueryKeys } from "@/entities/order/hooks/queryKeys";
import { useDeliveryResolver } from "./useDeliveryResolver";

interface UseCheckoutStateProps {
  cartItems: ProductBasket[] | undefined;
}

export const useCheckoutState = ({ cartItems = [] }: UseCheckoutStateProps) => {
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] =
    useState<ShippingMethod | null>(null);
  const [comment, setComment] = useState<string>("");

  // Получаем уникальных продавцов и их первые товары
  const sellerProductMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of cartItems) {
      if (!map.has(item.product.sellerId)) {
        map.set(item.product.sellerId, item.product.id);
      }
    }
    return map;
  }, [cartItems]);

  // Преобразуем Map в стабильный массив для useQueries
  const sellerProductEntries = useMemo(() => {
    return Array.from(sellerProductMap.entries());
  }, [sellerProductMap]);

  // Используем useQueries вместо вызова хуков в цикле
  const sellerQueries = useQueries({
    queries: sellerProductEntries.map(([sellerId, productId]) => ({
      queryKey: orderQueryKeys.orderData(productId),
      queryFn: () => orderApi.getOrderData(productId),
      enabled: !!productId,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  // Формируем данные для resolver
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

  // Используем resolver для определения доставки
  const deliveryResolution = useDeliveryResolver({
    cartItems,
    sellerTransfersData,
    selectedMethod: selectedDeliveryMethod,
  });

  // Автовыбор первого доступного метода если ничего не выбрано
  const handleAutoSelectMethod = useCallback(() => {
    if (
      !selectedDeliveryMethod &&
      deliveryResolution.availableMethods.length > 0
    ) {
      setSelectedDeliveryMethod(deliveryResolution.availableMethods[0]);
    }
  }, [selectedDeliveryMethod, deliveryResolution.availableMethods]);

  // Проверка готовности к оформлению
  const isReadyToSubmit = useMemo(() => {
    return (
      selectedAddress !== null &&
      selectedDeliveryMethod !== null &&
      cartItems.length > 0 &&
      !deliveryResolution.isLoading &&
      // Проверяем что для всех продавцов есть transfer
      [...deliveryResolution.sellerDeliveryInfo.values()].every(
        (info) => info.selectedTransfer !== null,
      )
    );
  }, [
    selectedAddress,
    selectedDeliveryMethod,
    cartItems,
    deliveryResolution.isLoading,
    deliveryResolution.sellerDeliveryInfo,
  ]);

  // Получаем transferId для конкретного продавца
  const getTransferIdForSeller = useCallback(
    (sellerId: number): number | null => {
      const info = deliveryResolution.sellerDeliveryInfo.get(sellerId);
      return info?.selectedTransfer?.id || null;
    },
    [deliveryResolution.sellerDeliveryInfo],
  );

  return {
    // Адрес
    selectedAddress,
    setSelectedAddress,

    // Способ доставки
    selectedDeliveryMethod,
    setSelectedDeliveryMethod,
    availableDeliveryMethods: deliveryResolution.availableMethods,
    handleAutoSelectMethod,

    // Комментарий
    comment,
    setComment,

    // Информация о доставке
    deliveryResolution,
    getTransferIdForSeller,

    // Состояние загрузки
    isLoadingDelivery: deliveryResolution.isLoading,
    isDeliveryError: deliveryResolution.isError,

    // Готовность
    isReadyToSubmit,
  };
};

export type CheckoutState = ReturnType<typeof useCheckoutState>;
