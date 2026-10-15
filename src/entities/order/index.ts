export { orderQueryKeys } from "./model/queryKeys";

// Queries
export { orderCasesApi } from "./api/orderCasesApi";
export { useOrderCasesQuery } from "./model/useOrderCasesQuery";
export { OrderCaseCard } from "./ui/OrderCaseCard";
export { getOrderCaseImageGroups } from "./lib/orderCaseImages";
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
export { getOrderPaymentBreakdown } from "./lib/orderPaymentBreakdown";
export type { OrderPaymentBreakdown } from "./lib/orderPaymentBreakdown";
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
  getAdminOrderActionFlags,
  SELLER_ORDER_ACTION_STATUSES,
  CUSTOMER_ORDER_ACTION_STATUSES,
  ORDER_NEW_STATUSES,
  ORDER_PAYMENT_STATUSES,
  ORDER_PROCESSING_STATUSES,
  ORDER_ASSEMBLING_STATUSES,
  ORDER_SHIPPING_STATUSES,
  ORDER_COMPLETED_STATUSES,
  ORDER_DISPUTED_STATUSES,
  ORDER_CANCELLED_STATUSES,
} from "./lib/orderStatusMeta";

// Types
export type {
  OrderCase,
  OrderCaseDetail,
  OrderCaseSummary,
  OrderCaseKind,
  OrderCaseState,
  OrderCaseOutcome,
  OrderCaseResolutionOutcome,
  ResolveOrderCaseRequest,
} from "./model/orderCase";
export type { ListOrdersDto, ListOrdersModel, OrderCancel, OrderStatus } from "./model/types";
export type { OrderProgressStep, OrderUserRole } from "./lib/orderStatusMeta";

export { orderApi } from "./api/orderApi";
export { adminOrderApi } from "./api/adminOrderApi";
export { adminOrderKeys, useAdminOrders } from "./model/adminQueries";
export { adminOrderStatuses } from "./model/admin";
export type { AdminOrderAction, AdminOrderDto, AdminOrderFilter } from "./model/admin";
