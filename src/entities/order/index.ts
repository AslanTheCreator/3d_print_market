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
  SELLER_ORDER_ACTION_STATUSES,
  CUSTOMER_ORDER_ACTION_STATUSES,
  ORDER_NEW_STATUSES,
  ORDER_PAYMENT_STATUSES,
  ORDER_PROCESSING_STATUSES,
  ORDER_ASSEMBLING_STATUSES,
  ORDER_SHIPPING_STATUSES,
  ORDER_COMPLETED_STATUSES,
  ORDER_DISPUTED_STATUSES,
} from "./lib/orderStatusMeta";

// Types
export type { ListOrdersModel, OrderCancel, OrderStatus } from "./model/types";
export type { OrderProgressStep, OrderUserRole } from "./lib/orderStatusMeta";

export { orderApi } from "./api/orderApi";
