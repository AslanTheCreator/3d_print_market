import { useState, useCallback } from "react";
import { AddressBaseModel } from "@/entities/address/model/types";
import { TransferBaseModel } from "@/entities/transfer/model/types";

type NotificationSeverity = "success" | "error" | "warning";

export const useCheckoutState = () => {
  const [selectedAddress, setSelectedAddress] =
    useState<AddressBaseModel | null>(null);
  const [selectedTransfers, setSelectedTransfers] = useState<
    Record<number, TransferBaseModel | null>
  >({});
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as NotificationSeverity,
  });

  const handleTransferSelect = useCallback(
    (sellerId: number, transfer: TransferBaseModel | null) => {
      setSelectedTransfers((prev) => ({ ...prev, [sellerId]: transfer }));
    },
    []
  );

  const showNotification = useCallback(
    (message: string, severity: NotificationSeverity) => {
      setNotification({ open: true, message, severity });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    selectedAddress,
    setSelectedAddress,
    selectedTransfers,
    handleTransferSelect,
    notification,
    showNotification,
    hideNotification,
  };
};
