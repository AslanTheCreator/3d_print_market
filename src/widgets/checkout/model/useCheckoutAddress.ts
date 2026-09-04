"use client";

import { useCallback, useState } from "react";
import { useAddresses, type Address } from "@/entities/address";
import { useCheckoutAddressCreation } from "./useCheckoutAddressCreation";

const EMPTY_ADDRESSES: Address[] = [];

export const useCheckoutAddress = () => {
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const {
    data: addresses = EMPTY_ADDRESSES,
    isLoading: isLoadingAddresses,
    isError: isAddressesError,
    refetch: refetchAddresses,
  } = useAddresses();

  const selectedAddress =
    addresses.find(
      (address) =>
        address.id === selectedAddressId && address.status === "ACTIVE",
    ) ?? null;
  const setSelectedAddress = useCallback((address: Address | null) => {
    setSelectedAddressId(address?.id ?? null);
  }, []);
  const reloadAddresses = useCallback(async () => {
    const result = await refetchAddresses({ throwOnError: true });
    return result.data ?? EMPTY_ADDRESSES;
  }, [refetchAddresses]);
  const addressCreation = useCheckoutAddressCreation({
    addresses,
    canStart: !isLoadingAddresses && !isAddressesError,
    reloadAddresses,
    onAddressSelect: setSelectedAddress,
  });

  return {
    selectedAddress,
    setSelectedAddress,
    addresses,
    isLoadingAddresses,
    isAddressesError,
    refetchAddresses,
    addressCreation,
  };
};
