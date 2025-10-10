import { useState, useCallback } from "react";
import { AddressBaseModel } from "@/entities/address/model/types";
import { TransferBaseModel } from "@/entities/transfer/model/types";

export const useCheckoutState = () => {
  const [selectedAddress, setSelectedAddress] =
    useState<AddressBaseModel | null>(null);
  const [selectedTransfers, setSelectedTransfers] = useState<
    Record<number, TransferBaseModel | null>
  >({});

  const handleTransferSelect = useCallback(
    (sellerId: number, transfer: TransferBaseModel | null) => {
      setSelectedTransfers((prev) => ({ ...prev, [sellerId]: transfer }));
    },
    []
  );

  return {
    selectedAddress,
    setSelectedAddress,
    selectedTransfers,
    handleTransferSelect,
  };
};
