import {
  CheckCircle,
  Payment,
  LocalShipping,
  Inventory,
  Update,
} from "@mui/icons-material";
import { SvgIconProps } from "@mui/material";

// Статусы заказов, требующие действий от продавца
export const SELLER_ACTION_STATUSES = [
  "BOOKED",
  "AWAITING_PREPAYMENT_APPROVAL",
  "ASSEMBLING",
] as const;

// Статусы заказов, требующие действий от покупателя
export const CUSTOMER_ACTION_STATUSES = [
  "AWAITING_PREPAYMENT",
  "AWAITING_PAYMENT",
  "ON_THE_WAY",
] as const;

export type PendingActionType =
  | "seller_confirm"
  | "seller_confirm_prepayment"
  | "seller_ship"
  | "customer_prepay"
  | "customer_pay"
  | "customer_confirm_receipt"
  | "product_renewal";

export interface PendingActionGroup {
  type: PendingActionType;
  label: string;
  count: number;
  icon: React.ComponentType<SvgIconProps>;
  color: string;
  href: string;
}

// Маппинг статусов заказов на описания действий
export const SELLER_STATUS_ACTION_MAP: Record<
  string,
  {
    type: PendingActionType;
    label: string;
    icon: React.ComponentType<SvgIconProps>;
    color: string;
  }
> = {
  BOOKED: {
    type: "seller_confirm",
    label: "Подтвердить заказ",
    icon: CheckCircle,
    color: "#ff9800",
  },
  AWAITING_PREPAYMENT_APPROVAL: {
    type: "seller_confirm_prepayment",
    label: "Подтвердить предоплату",
    icon: Payment,
    color: "#2196f3",
  },
  ASSEMBLING: {
    type: "seller_ship",
    label: "Отправить товар",
    icon: LocalShipping,
    color: "#9c27b0",
  },
};

export const CUSTOMER_STATUS_ACTION_MAP: Record<
  string,
  {
    type: PendingActionType;
    label: string;
    icon: React.ComponentType<SvgIconProps>;
    color: string;
  }
> = {
  AWAITING_PREPAYMENT: {
    type: "customer_prepay",
    label: "Оплатить предоплату",
    icon: Payment,
    color: "#2196f3",
  },
  AWAITING_PAYMENT: {
    type: "customer_pay",
    label: "Оплатить заказ",
    icon: Payment,
    color: "#f44336",
  },
  ON_THE_WAY: {
    type: "customer_confirm_receipt",
    label: "Подтвердить получение",
    icon: Inventory,
    color: "#4caf50",
  },
};

export const PRODUCT_RENEWAL_ACTION = {
  type: "product_renewal" as PendingActionType,
  label: "Продлить товар",
  icon: Update,
  color: "#ff5722",
  href: "/dashboard/products",
};
