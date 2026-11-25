import { useState } from "react";

export function useOrderPaymentAction() {
  const [isOpen, setOpen] = useState(false);
  return { isOpen, open: () => setOpen(true), close: () => setOpen(false) };
}
