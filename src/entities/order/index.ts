export { orderQueryKeys } from "./model/queryKeys";

// Queries
export {
  useOrderData,
  useSellerOrders,
  useCustomerOrders,
} from "./model/useOrderQueries";

// Mutations
export {
  useCreateOrder,
  useConfirmOrderBySeller,
  useConfirmPreOrderBySeller,
  useConfirmPrepaymentByCustomer,
  useConfirmPaymentByCustomer,
  useConfirmReceiptByCustomer,
  useSendOrderBySeller,
  useCancelOrder,
} from "./model/useOrderMutations";

export { OrderStatusChip } from "./ui/OrderStatusChip";
export { OrdersEmptyState } from "./ui/OrdersEmptyState";
export {
  getOrderStatusMeta,
  orderNeedsAttention,
  isActiveOrderStatus,
  shouldShowPaymentProofForRole,
  shouldShowTrackingForRole,
  shouldShowOrderProgress,
  getOrderProgressSteps,
  getOrderStatusActionHint,
  getCustomerOrderActionFlags,
  getSellerOrderActionFlags,
} from "./lib/orderStatusMeta";

// Types
export type { ListOrdersModel, OrderCancel, OrderStatus } from "./model/types";
export type { OrderProgressStep, OrderUserRole } from "./lib/orderStatusMeta";

export { orderApi } from "./api/orderApi";
