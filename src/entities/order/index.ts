export { orderQueryKeys } from "./model/queryKeys";

// Queries
export { orderTermsApi } from "./api/orderTermsApi";
export { orderPaymentApi } from "./api/orderPaymentApi";
export { getOrderPaymentActions } from "./model/orderPayment";
export type { PaymentContext, PaymentStage, SubmitPaymentRequest, ApprovePaymentRequest, ReturnPaymentRequest } from "./model/orderPayment";
export type { OrderTermsEvent } from "./lib/orderTermsHistory";
export { knownOpenAdminCase, casesAllowDelivery, readDeliveryOrder, readDeliveryCases, invalidateDeliveryReads } from "./model/orderTermsQueries";
export { OrderDeliveryTermsHistory } from "./ui/OrderDeliveryTermsHistory";
export { editableDeliveryStatus, hasAgentId, hasTermsVersion, normalizeDeliveryAmount } from "./model/orderTerms";
export type { DeliveryTermsContext, DeliveryTermsRequest, TermsOrder } from "./model/orderTerms";
export { orderCasesApi } from "./api/orderCasesApi";
export { adminOrderCasesApi } from "./api/adminOrderCasesApi";
export { adminOrderCaseKeys, hasAdminOrderCaseAccess, useAdminOrderCases, useAdminOrderCaseDetail } from "./model/adminOrderCaseQueries";
export { getAdminOrderCaseOutcomes } from "./lib/adminOrderCasePolicy";
export { useOrderCasesQuery } from "./model/useOrderCasesQuery";
export { useCreateOrderCase } from "./model/useCreateOrderCase";
export { getAvailableOrderCaseKinds } from "./lib/orderCaseAvailability";
export type { OrderCaseAccess } from "./lib/orderCaseAvailability";
export { getDisputePaymentCase, hasDisputePaymentProof } from "./lib/disputePaymentAvailability";
export { OrderCaseCard, getSafeCaseTelegramUrl } from "./ui/OrderCaseCard";
export { getOrderCaseImageGroups } from "./lib/orderCaseImages";
export {
  useOrderData,
  usePaymentTermsCheck,
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
export { OrderProductThumbnail } from "./ui/OrderProductThumbnail";
export { OrderCalculationSummary } from "./ui/OrderCalculationSummary";
export { OrderDeliverySnapshot } from "./ui/OrderDeliverySnapshot";
export { deliveryCarrierLabels, deliveryAddressMaxLength, getDeliveryFieldErrors, getOrderDeliveryAddress } from "./lib/orderDelivery";
export type { DeliveryCarrier, OrderCreateModel } from "./model/types";
export { getOrderPaymentBreakdown, hasOrderPrepayment } from "./lib/orderPaymentBreakdown";
export { getOrderReviewState } from "./lib/orderReviewState";
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
  CreateOrderCaseRequest,
} from "./model/orderCase";
export type { ListOrdersDto, ListOrdersModel, OrderCalculationDto, OrderCancel, OrderStatus } from "./model/types";
export type { OrderProgressStep, OrderUserRole } from "./lib/orderStatusMeta";

export { orderApi } from "./api/orderApi";
export { adminOrderApi } from "./api/adminOrderApi";
export { adminOrderKeys, useAdminOrders } from "./model/adminQueries";
export { adminOrderStatuses } from "./model/admin";
export type { AdminOrderAction, AdminOrderDto, AdminOrderFilter } from "./model/admin";
