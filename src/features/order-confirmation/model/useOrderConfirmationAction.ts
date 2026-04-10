import { useState } from "react";
import {
  useConfirmOrderBySeller,
  useConfirmPreOrderBySeller,
} from "@/entities/order";

interface OrderConfirmationActionResult<TMutation> {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  mutation: TMutation;
}

export const useOrderConfirmationAction = (): OrderConfirmationActionResult<
  ReturnType<typeof useConfirmOrderBySeller>
> => {
  const [isOpen, setIsOpen] = useState(false);
  const mutation = useConfirmOrderBySeller();

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    mutation,
  };
};

export const useOrderPreOrderConfirmationAction =
  (): OrderConfirmationActionResult<
    ReturnType<typeof useConfirmPreOrderBySeller>
  > => {
    const [isOpen, setIsOpen] = useState(false);
    const mutation = useConfirmPreOrderBySeller();

    return {
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      mutation,
    };
  };
