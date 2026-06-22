import type { Address } from "@/shared/types";
import type { SellerCheckoutGroup } from "./types";

interface GetCheckoutSubmitReadinessParams {
  selectedAddress: Address | null;
  addressesCount: number;
  isLoadingAddresses: boolean;
  isAddressesError: boolean;
  selectedItemsCount: number;
  activeSellerGroups: SellerCheckoutGroup[];
}

export interface CheckoutSubmitReadiness {
  isReadyToSubmit: boolean;
  submitBlockerMessage: string | null;
}

export function getCheckoutSubmitReadiness({
  selectedAddress,
  addressesCount,
  isLoadingAddresses,
  isAddressesError,
  selectedItemsCount,
  activeSellerGroups,
}: GetCheckoutSubmitReadinessParams): CheckoutSubmitReadiness {
  const submitBlockerMessage = getSubmitBlockerMessage({
    selectedAddress,
    addressesCount,
    isLoadingAddresses,
    isAddressesError,
    selectedItemsCount,
    activeSellerGroups,
  });

  return {
    isReadyToSubmit: submitBlockerMessage === null,
    submitBlockerMessage,
  };
}

function getSubmitBlockerMessage({
  selectedAddress,
  addressesCount,
  isLoadingAddresses,
  isAddressesError,
  selectedItemsCount,
  activeSellerGroups,
}: GetCheckoutSubmitReadinessParams): string | null {
  if (selectedItemsCount === 0) {
    return "Выберите хотя бы один товар";
  }

  if (selectedAddress === null) {
    if (isLoadingAddresses) {
      return "Загружаем адреса доставки";
    }

    if (isAddressesError) {
      return "Не удалось загрузить адреса доставки";
    }

    if (addressesCount === 0) {
      return "Добавьте адрес доставки в настройках профиля";
    }

    return "Выберите адрес доставки";
  }

  if (activeSellerGroups.length === 0) {
    return "Не удалось определить доставку для выбранных товаров";
  }

  for (const group of activeSellerGroups) {
    const sellerName = group.sellerLogin || `#${group.sellerId}`;

    if (group.isLoading) {
      return `Загружаем доставку продавца «${sellerName}»`;
    }

    if (group.isError) {
      return `Не удалось загрузить доставку продавца «${sellerName}»`;
    }

    if (group.transfers.length === 0) {
      return `У продавца «${sellerName}» нет доступных способов доставки`;
    }

    if (group.selectedTransfer === null) {
      return `Выберите доставку продавца «${sellerName}»`;
    }
  }

  return null;
}
