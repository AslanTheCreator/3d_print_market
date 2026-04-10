import { useState } from "react";
import {
  useConfirmPaymentByCustomer,
  useConfirmPrepaymentByCustomer,
} from "@/entities/order";

interface OrderPaymentActionResult<TMutation> {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  mutation: TMutation;
}

export const useOrderPaymentAction = (): OrderPaymentActionResult<
  ReturnType<typeof useConfirmPaymentByCustomer>
> => {
  const [isOpen, setIsOpen] = useState(false);
  const mutation = useConfirmPaymentByCustomer();

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    mutation,
  };
};

export const useOrderPrepaymentAction = (): OrderPaymentActionResult<
  ReturnType<typeof useConfirmPrepaymentByCustomer>
> => {
  const [isOpen, setIsOpen] = useState(false);
  const mutation = useConfirmPrepaymentByCustomer();

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    mutation,
  };
};
