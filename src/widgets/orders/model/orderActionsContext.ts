import { createContext, useContext } from "react";

export const OrderActionsContext = createContext<{
  actionsAvailable: boolean;
  retry?: () => void;
  retryPending: boolean;
}>({ actionsAvailable: true, retryPending: false });
export const useOrderActionsRecovery = () => useContext(OrderActionsContext);
export const useOrderActionsAvailable = () => useOrderActionsRecovery().actionsAvailable;
