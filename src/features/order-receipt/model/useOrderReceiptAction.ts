import { useState } from "react";
import { useConfirmReceiptByCustomer } from "@/entities/order";

interface OrderReceiptActionResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  mutation: ReturnType<typeof useConfirmReceiptByCustomer>;
}

export const useOrderReceiptAction = (): OrderReceiptActionResult => {
  const [isOpen, setIsOpen] = useState(false);
  const mutation = useConfirmReceiptByCustomer();

  return {
    isOpen,
    open: () => {
      mutation.reset();
      setIsOpen(true);
    },
    close: () => {
      mutation.reset();
      setIsOpen(false);
    },
    mutation,
  };
};
