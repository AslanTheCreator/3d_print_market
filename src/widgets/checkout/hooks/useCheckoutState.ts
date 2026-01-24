"use client";

import { useState, useCallback, useMemo } from "react";
import { AddressBaseModel } from "@/entities/address/model/types";
import { ShoppingMethods } from "@/entities/transfer/model/types";
import { CartProductModel } from "@/entities/cart";
import { useOrderData } from "@/entities/order";
import { useDeliveryResolver } from "./useDeliveryResolver";

interface UseCheckoutStateProps {
  cartItems: CartProductModel[] | undefined;
}

export const useCheckoutState = ({ cartItems = [] }: UseCheckoutStateProps) => {
  const [selectedAddress, setSelectedAddress] =
    useState<AddressBaseModel | null>(null);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] =
    useState<ShoppingMethods | null>(null);
  const [comment, setComment] = useState<string>("");

  // Получаем уникальных продавцов
  const uniqueSellerIds = useMemo(() => {
    return [...new Set(cartItems.map((item) => item.sellerId))];
  }, [cartItems]);

  // Загружаем transfers для каждого продавца
  // Используем первый товар продавца для получения его transfers
  const sellerProductIds = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of cartItems) {
      if (!map.has(item.sellerId)) {
        map.set(item.sellerId, item.id);
      }
    }
    return map;
  }, [cartItems]);

  // Запрашиваем данные для каждого продавца
  const sellerQueries = uniqueSellerIds.map((sellerId) => {
    const productId = sellerProductIds.get(sellerId) || 0;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const query = useOrderData(productId);
    return {
      sellerId,
      productId,
      ...query,
    };
  });

  // Формируем данные для resolver
  const sellerTransfersData = useMemo(() => {
    return sellerQueries.map((query) => ({
      sellerId: query.sellerId,
      transfers: query.data?.sellerTransfers || [],
      isLoading: query.isLoading,
      isError: query.isError,
    }));
  }, [sellerQueries]);

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
