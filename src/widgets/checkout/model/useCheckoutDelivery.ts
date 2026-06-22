"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { ProductBasket } from "@/entities/cart";
import { orderApi, orderQueryKeys } from "@/entities/order";
import type { Transfer } from "@/shared/types";
import { ApiError } from "@/shared/lib/errorHandler";
import {
  areTransferSelectionsEqual,
  getActiveTransfers,
  groupCartItemsBySeller,
  reconcileSelectedTransfers,
} from "./checkoutDeliveryGroups";
import type {
  SelectedSellerDelivery,
  SellerCheckoutGroup,
} from "./types";

interface UseCheckoutDeliveryProps {
  cartItems: ProductBasket[];
  selectedProductIds: Set<number>;
}

const DELIVERY_ERROR_FALLBACK = "Не удалось загрузить способы доставки";

export const useCheckoutDelivery = ({
  cartItems,
  selectedProductIds,
}: UseCheckoutDeliveryProps) => {
  const [selectedTransfersBySeller, setSelectedTransfersBySeller] = useState<
    Map<number, Transfer>
  >(() => new Map());

  const sellerCartGroups = useMemo(
    () => groupCartItemsBySeller(cartItems),
    [cartItems],
  );

  const sellerQueries = useQueries({
    queries: sellerCartGroups.map((group) => ({
      queryKey: orderQueryKeys.orderData(group.items[0].product.id),
      queryFn: () => orderApi.getOrderData(group.items[0].product.id),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const sellerGroups = useMemo<SellerCheckoutGroup[]>(() => {
    return sellerCartGroups.map((group, index) => {
      const query = sellerQueries[index];
      const transfers = getActiveTransfers(query?.data?.sellerTransfers ?? []);
      const storedSelection = selectedTransfersBySeller.get(group.sellerId);
      const selectedTransfer = storedSelection
        ? transfers.find((transfer) => transfer.id === storedSelection.id) ??
          (query?.isLoading || query?.isError ? storedSelection : null)
        : null;

      return {
        ...group,
        transfers,
        selectedTransfer,
        isActive: group.items.some((item) =>
          selectedProductIds.has(item.product.id),
        ),
        isLoading: query?.isLoading ?? true,
        isError: query?.isError ?? false,
        errorMessage: getDeliveryErrorMessage(query?.error),
      };
    });
  }, [selectedProductIds, selectedTransfersBySeller, sellerCartGroups, sellerQueries]);

  useEffect(() => {
    setSelectedTransfersBySeller((currentSelections) => {
      const nextSelections = reconcileSelectedTransfers(
        currentSelections,
        sellerGroups.map((group) => ({
          sellerId: group.sellerId,
          transfers: group.transfers,
          isLoading: group.isLoading,
          isError: group.isError,
        })),
      );

      return areTransferSelectionsEqual(currentSelections, nextSelections)
        ? currentSelections
        : nextSelections;
    });
  }, [sellerGroups]);

  const activeSellerGroups = useMemo(
    () => sellerGroups.filter((group) => group.isActive),
    [sellerGroups],
  );

  const selectedSellerDeliveries = useMemo<SelectedSellerDelivery[]>(() => {
    return activeSellerGroups.flatMap((group) =>
      !group.isLoading && !group.isError && group.selectedTransfer
        ? [
            {
              sellerId: group.sellerId,
              sellerLogin: group.sellerLogin,
              transfer: group.selectedTransfer,
            },
          ]
        : [],
    );
  }, [activeSellerGroups]);

  const selectTransfer = useCallback((sellerId: number, transfer: Transfer) => {
    if (transfer.status !== "ACTIVE") {
      return;
    }

    setSelectedTransfersBySeller((currentSelections) => {
      const nextSelections = new Map(currentSelections);
      nextSelections.set(sellerId, transfer);
      return nextSelections;
    });
  }, []);

  const retrySellerDelivery = useCallback(
    (sellerId: number) => {
      const sellerIndex = sellerCartGroups.findIndex(
        (group) => group.sellerId === sellerId,
      );

      if (sellerIndex >= 0) {
        void sellerQueries[sellerIndex]?.refetch();
      }
    },
    [sellerCartGroups, sellerQueries],
  );

  const getTransferIdForSeller = useCallback(
    (sellerId: number): number | null => {
      return (
        activeSellerGroups.find((group) => group.sellerId === sellerId)
          ?.selectedTransfer?.id ?? null
      );
    },
    [activeSellerGroups],
  );

  return {
    sellerGroups,
    activeSellerGroups,
    selectedSellerDeliveries,
    selectedTransfers: selectedSellerDeliveries.map(
      (delivery) => delivery.transfer,
    ),
    selectTransfer,
    retrySellerDelivery,
    getTransferIdForSeller,
  };
};

function getDeliveryErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return DELIVERY_ERROR_FALLBACK;
}
