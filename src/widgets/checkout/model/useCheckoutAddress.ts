"use client";

import { useEffect, useState } from "react";
import { useAddresses } from "@/entities/address";
import { Address } from "@/shared/types";

export const useCheckoutAddress = () => {
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const {
    data: addresses = [],
    isLoading: isLoadingAddresses,
    isError: isAddressesError,
    refetch: refetchAddresses,
  } = useAddresses();

  useEffect(() => {
    if (
      selectedAddress &&
      !addresses.some((address) => address.id === selectedAddress.id)
    ) {
      setSelectedAddress(null);
    }
  }, [addresses, selectedAddress]);

  return {
    selectedAddress,
    setSelectedAddress,
    addresses,
    isLoadingAddresses,
    isAddressesError,
    refetchAddresses,
  };
};
