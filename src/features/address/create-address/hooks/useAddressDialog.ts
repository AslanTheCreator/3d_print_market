import { useState, useCallback } from "react";

interface UseAddAddressDialogReturn {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  handleSuccess: () => void;
}

/**
 * Хук для управления состоянием диалога добавления адреса
 */
export const useAddAddressDialog = (
  onSuccess?: () => void
): UseAddAddressDialogReturn => {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    closeDialog();
  }, [onSuccess, closeDialog]);

  return {
    isOpen,
    openDialog,
    closeDialog,
    handleSuccess,
  };
};
