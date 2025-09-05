import { useState, useCallback } from "react";

interface UseAuthRequiredReturn {
  isOpen: boolean;
  productName: string | undefined;
  showDialog: (productName?: string) => void;
  hideDialog: () => void;
}

export const useAuthRequired = (): UseAuthRequiredReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [productName, setProductName] = useState<string | undefined>();

  const showDialog = useCallback((productName?: string) => {
    setProductName(productName);
    setIsOpen(true);
  }, []);

  const hideDialog = useCallback(() => {
    setIsOpen(false);
    setProductName(undefined);
  }, []);

  return {
    isOpen,
    productName,
    showDialog,
    hideDialog,
  };
};
