import type { OrderStatus } from "../model/types";

export type OrderUserRole = "seller" | "customer";

export type OrderStatusChipColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export interface OrderProgressStep {
  key: OrderStatus;
  label: string;
  sellerAction?: boolean;
  customerAction?: boolean;
}

interface OrderStatusMeta {
  label: string;
  chipColor: OrderStatusChipColor;
  isActive: boolean;
}

const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  BOOKED: {
    label: "Забронирован",
    chipColor: "warning",
    isActive: true,
  },
  AWAITING_PREPAYMENT: {
    label: "Ожидает предоплату",
    chipColor: "info",
    isActive: true,
  },
  AWAITING_PREPAYMENT_APPROVAL: {
    label: "Ожидает подтверждение предоплаты",
    chipColor: "info",
    isActive: false,
  },
  AWAITING_PAYMENT: {
    label: "Ожидает оплату",
    chipColor: "info",
    isActive: true,
  },
  ASSEMBLING: {
    label: "Собирается",
    chipColor: "primary",
    isActive: true,
  },
  ON_THE_WAY: {
    label: "В пути",
    chipColor: "primary",
    isActive: true,
  },
  DISPUTED: {
    label: "Спор",
    chipColor: "error",
    isActive: false,
  },
  COMPLETED: {
    label: "Завершен",
    chipColor: "success",
    isActive: false,
  },
  FAILED: {
    label: "Отменен",
    chipColor: "error",
    isActive: false,
  },
};

const SELLER_ATTENTION_STATUSES: readonly OrderStatus[] = [
  "BOOKED",
  "AWAITING_PREPAYMENT_APPROVAL",
  "ASSEMBLING",
];

const CUSTOMER_ATTENTION_STATUSES: readonly OrderStatus[] = [
  "AWAITING_PREPAYMENT",
  "AWAITING_PAYMENT",
  "ON_THE_WAY",
];

const CUSTOMER_STATUSES_WITH_TRACKING: readonly OrderStatus[] = [
  "ON_THE_WAY",
  "COMPLETED",
];

const SELLER_STATUSES_WITH_PAYMENT_PROOF: readonly OrderStatus[] = [
  "AWAITING_PREPAYMENT_APPROVAL",
  "AWAITING_PAYMENT",
  "ASSEMBLING",
  "ON_THE_WAY",
  "COMPLETED",
  "DISPUTED",
];

const REGULAR_PROGRESS_STEPS: readonly OrderProgressStep[] = [
  { key: "BOOKED", label: "Забронирован", sellerAction: true },
  { key: "AWAITING_PAYMENT", label: "Оплата", customerAction: true },
  { key: "ASSEMBLING", label: "Сборка", sellerAction: true },
  { key: "ON_THE_WAY", label: "В пути", customerAction: true },
  { key: "COMPLETED", label: "Завершен" },
];

const PREORDER_PROGRESS_STEPS: readonly OrderProgressStep[] = [
  { key: "BOOKED", label: "Забронирован", sellerAction: true },
  { key: "AWAITING_PREPAYMENT", label: "Предоплата", customerAction: true },
  {
    key: "AWAITING_PREPAYMENT_APPROVAL",
    label: "Подтверждение",
    sellerAction: true,
  },
  { key: "AWAITING_PAYMENT", label: "Оплата", customerAction: true },
  { key: "ASSEMBLING", label: "Сборка", sellerAction: true },
  { key: "ON_THE_WAY", label: "В пути", customerAction: true },
  { key: "COMPLETED", label: "Завершен" },
];

export const getOrderStatusMeta = (status: OrderStatus) => {
  return ORDER_STATUS_META[status];
};

export const orderNeedsAttention = (
  status: OrderStatus,
  userRole: OrderUserRole,
) => {
  return userRole === "seller"
    ? SELLER_ATTENTION_STATUSES.includes(status)
    : CUSTOMER_ATTENTION_STATUSES.includes(status);
};

export const isActiveOrderStatus = (status: OrderStatus) => {
  return ORDER_STATUS_META[status].isActive;
};

export const shouldShowPaymentProofForRole = (
  status: OrderStatus,
  userRole: OrderUserRole,
) => {
  return (
    userRole === "seller" &&
    SELLER_STATUSES_WITH_PAYMENT_PROOF.includes(status)
  );
};

export const shouldShowTrackingForRole = (
  status: OrderStatus,
  userRole: OrderUserRole,
) => {
  return (
    userRole === "customer" && CUSTOMER_STATUSES_WITH_TRACKING.includes(status)
  );
};

export const shouldShowOrderProgress = (
  status: OrderStatus,
  isPreorder: boolean,
) => {
  if (isPreorder) {
    return true;
  }

  return !["AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL"].includes(
    status,
  );
};

export const getOrderProgressSteps = (isPreorder: boolean) => {
  return isPreorder ? PREORDER_PROGRESS_STEPS : REGULAR_PROGRESS_STEPS;
};

export const getCustomerOrderActionFlags = (status: OrderStatus) => {
  return {
    canPay: status === "AWAITING_PAYMENT",
    canPrePay: status === "AWAITING_PREPAYMENT",
    canConfirmReceipt: status === "ON_THE_WAY",
    canCancel: !["COMPLETED", "FAILED", "DISPUTED"].includes(status),
    canLeaveReview: status === "COMPLETED",
  };
};

export const getSellerOrderActionFlags = (status: OrderStatus) => {
  return {
    canConfirmOrder: status === "BOOKED",
    canConfirmPreOrder: status === "AWAITING_PREPAYMENT_APPROVAL",
    canShipOrder: status === "ASSEMBLING",
    canCancel: !["COMPLETED", "FAILED", "DISPUTED"].includes(status),
  };
};
