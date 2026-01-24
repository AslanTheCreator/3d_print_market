import { useMemo, useCallback } from "react";
import { CartProductModel } from "@/entities/cart";
import {
  ShoppingMethods,
  TransferBaseModel,
} from "@/entities/transfer/model/types";
import { useDictionary } from "@/entities/dictionary";
import { DeliveryResolution, SellerDeliveryInfo } from "../model/types";

interface SellerTransfers {
  sellerId: number;
  transfers: TransferBaseModel[];
  isLoading: boolean;
  isError: boolean;
}

interface UseDeliveryResolverProps {
  cartItems: CartProductModel[];
  sellerTransfersData: SellerTransfers[];
  selectedMethod: ShoppingMethods | null;
}

// Приоритет fallback методов (от более предпочтительного к менее)
const FALLBACK_PRIORITY: ShoppingMethods[] = [
  "TRANSPORT_COMPANY",
  "RUSSIAN_POST",
  "PRODUCT_PICKUP",
  "FREE_POST",
];

export const useDeliveryResolver = ({
  cartItems,
  sellerTransfersData,
  selectedMethod,
}: UseDeliveryResolverProps): DeliveryResolution & {
  isLoading: boolean;
  isError: boolean;
} => {
  const { data: shoppingMethods } = useDictionary("SHOPPING_METHODS");

  const isLoading = sellerTransfersData.some((s) => s.isLoading);
  const isError = sellerTransfersData.some((s) => s.isError);

  // Получаем уникальных продавцов из корзины
  const uniqueSellerIds = useMemo(() => {
    return [...new Set(cartItems.map((item) => item.sellerId))];
  }, [cartItems]);

  // Находим доступные способы доставки (пересечение)
  const availableMethods = useMemo((): ShoppingMethods[] => {
    if (isLoading || sellerTransfersData.length === 0) return [];

    // Получаем методы для каждого продавца
    const methodsBySeller = sellerTransfersData.map((seller) => {
      return new Set(seller.transfers.map((t) => t.sending));
    });

    if (methodsBySeller.length === 0) return [];

    // Находим пересечение
    const intersection = methodsBySeller.reduce((acc, current) => {
      return new Set([...acc].filter((method) => current.has(method)));
    });

    // Сортируем по приоритету из словаря
    const methodOrder = shoppingMethods?.map((m) => m.value) || [];
    return [...intersection].sort((a, b) => {
      const indexA = methodOrder.indexOf(a);
      const indexB = methodOrder.indexOf(b);
      return indexA - indexB;
    });
  }, [sellerTransfersData, shoppingMethods, isLoading]);

  // Разрешаем доставку для каждого продавца
  const resolveDelivery = useCallback((): {
    sellerDeliveryInfo: Map<number, SellerDeliveryInfo>;
    hasFallbacks: boolean;
    fallbackMessages: string[];
  } => {
    const sellerDeliveryInfo = new Map<number, SellerDeliveryInfo>();
    const fallbackMessages: string[] = [];
    let hasFallbacks = false;

    if (!selectedMethod) {
      return { sellerDeliveryInfo, hasFallbacks, fallbackMessages };
    }

    for (const sellerData of sellerTransfersData) {
      const { sellerId, transfers } = sellerData;

      // Ищем transfer с выбранным методом
      const matchingTransfer = transfers.find(
        (t) => t.sending === selectedMethod,
      );

      if (matchingTransfer) {
        // Нашли точное совпадение
        sellerDeliveryInfo.set(sellerId, {
          sellerId,
          selectedTransfer: matchingTransfer,
          isFallback: false,
        });
      } else {
        // Нужен fallback
        hasFallbacks = true;

        // Ищем альтернативу по приоритету
        let fallbackTransfer: TransferBaseModel | null = null;
        for (const fallbackMethod of FALLBACK_PRIORITY) {
          fallbackTransfer =
            transfers.find((t) => t.sending === fallbackMethod) || null;
          if (fallbackTransfer) break;
        }

        // Если не нашли по приоритету, берём первый доступный
        if (!fallbackTransfer && transfers.length > 0) {
          fallbackTransfer = transfers[0];
        }

        const methodName = getMethodDisplayName(
          selectedMethod,
          shoppingMethods,
        );
        const fallbackMethodName = fallbackTransfer
          ? getMethodDisplayName(fallbackTransfer.sending, shoppingMethods)
          : "недоступен";

        // Находим товары этого продавца для сообщения
        const sellerItems = cartItems.filter(
          (item) => item.sellerId === sellerId,
        );
        const itemNames = sellerItems.map((item) => item.name).join(", ");

        if (fallbackTransfer) {
          fallbackMessages.push(
            `Для "${truncate(itemNames, 50)}" недоступен "${methodName}". Будет использован "${fallbackMethodName}".`,
          );
        } else {
          fallbackMessages.push(
            `Для "${truncate(itemNames, 50)}" нет доступных способов доставки.`,
          );
        }

        sellerDeliveryInfo.set(sellerId, {
          sellerId,
          selectedTransfer: fallbackTransfer,
          isFallback: true,
          fallbackReason: `${methodName} недоступен`,
          originalMethod: selectedMethod,
        });
      }
    }

    return { sellerDeliveryInfo, hasFallbacks, fallbackMessages };
  }, [selectedMethod, sellerTransfersData, cartItems, shoppingMethods]);

  const { sellerDeliveryInfo, hasFallbacks, fallbackMessages } = useMemo(
    () => resolveDelivery(),
    [resolveDelivery],
  );

  return {
    availableMethods,
    sellerDeliveryInfo,
    hasFallbacks,
    fallbackMessages,
    isLoading,
    isError,
  };
};

// Вспомогательные функции
function getMethodDisplayName(
  method: ShoppingMethods,
  shoppingMethods: any[] | undefined,
): string {
  const methodInfo = shoppingMethods?.find((m) => m.value === method);
  return methodInfo?.description || method;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
