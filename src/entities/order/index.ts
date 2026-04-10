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

// UI Components
export { OrderHistory } from "./ui/OrderHistory";
export { OrderProgress } from "./ui/OrderProgress";
export { OrderStatusChip } from "./ui/OrderStatusChip";
export { UserInfo } from "./ui/UserInfo";
export { ProductInfo } from "./ui/ProductInfo";
export { DeliveryInfo } from "./ui/DeliveryInfo";
export { OrdersEmptyState } from "./ui/OrdersEmptyState";
export { PaymentProofImages } from "./ui/PaymentProofImages";
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
