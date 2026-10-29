import { createContext, useContext } from "react";

interface OrderActionsRecovery {
  actionsAvailable: boolean;
  retry?: () => void;
  retryPending: boolean;
}
export const OrderActionsContext = createContext<(orderId: number) => OrderActionsRecovery>(() => ({ actionsAvailable: true, retryPending: false }));
export const useOrderActionsRecovery = (orderId: number) => useContext(OrderActionsContext)(orderId);
export const useOrderActionsAvailable = (orderId: number) => useOrderActionsRecovery(orderId).actionsAvailable;
