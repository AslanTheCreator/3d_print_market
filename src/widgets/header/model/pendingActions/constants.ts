import {
  CUSTOMER_ORDER_ACTION_STATUSES,
  SELLER_ORDER_ACTION_STATUSES,
} from "@/entities/order";

// Статусы заказов, требующие действий от продавца
export const SELLER_ACTION_STATUSES = SELLER_ORDER_ACTION_STATUSES;

// Статусы заказов, требующие действий от покупателя
export const CUSTOMER_ACTION_STATUSES = CUSTOMER_ORDER_ACTION_STATUSES;

export type PendingActionType =
  | "seller_confirm"
  | "seller_confirm_prepayment"
  | "seller_ship"
  | "customer_prepay"
  | "customer_pay"
  | "customer_confirm_receipt"
  | "product_renewal";

export type PendingActionIconKey =
  | "check-circle"
  | "payment"
  | "local-shipping"
  | "inventory"
  | "update";

export interface PendingActionGroup {
  type: PendingActionType;
  label: string;
  count: number;
  iconKey: PendingActionIconKey;
  color: string;
  href: string;
}

// Маппинг статусов заказов на описания действий
export const SELLER_STATUS_ACTION_MAP: Record<
  string,
  {
    type: PendingActionType;
    label: string;
    iconKey: PendingActionIconKey;
    color: string;
  }
> = {
  BOOKED: {
    type: "seller_confirm",
    label: "Подтвердить заказ",
    iconKey: "check-circle",
    color: "#ff9800",
  },
  AWAITING_PREPAYMENT_APPROVAL: {
    type: "seller_confirm_prepayment",
    label: "Подтвердить предоплату",
    iconKey: "payment",
    color: "#2196f3",
  },
  ASSEMBLING: {
    type: "seller_ship",
    label: "Отправить товар",
    iconKey: "local-shipping",
    color: "#9c27b0",
  },
};

export const CUSTOMER_STATUS_ACTION_MAP: Record<
  string,
  {
    type: PendingActionType;
    label: string;
    iconKey: PendingActionIconKey;
    color: string;
  }
> = {
  AWAITING_PREPAYMENT: {
    type: "customer_prepay",
    label: "Оплатить предоплату",
    iconKey: "payment",
    color: "#2196f3",
  },
  AWAITING_PAYMENT: {
    type: "customer_pay",
    label: "Оплатить заказ",
    iconKey: "payment",
    color: "#f44336",
  },
  ON_THE_WAY: {
    type: "customer_confirm_receipt",
    label: "Подтвердить получение",
    iconKey: "inventory",
    color: "#4caf50",
  },
};

export const PRODUCT_RENEWAL_ACTION = {
  type: "product_renewal" as PendingActionType,
  label: "Продлить товар",
  iconKey: "update" as PendingActionIconKey,
  color: "#ff5722",
  href: "/dashboard/products",
};
