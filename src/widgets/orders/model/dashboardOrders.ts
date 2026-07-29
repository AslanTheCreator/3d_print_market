import {
  ORDER_ASSEMBLING_STATUSES,
  ORDER_COMPLETED_STATUSES,
  ORDER_DISPUTED_STATUSES,
  ORDER_NEW_STATUSES,
  ORDER_PAYMENT_STATUSES,
  ORDER_PROCESSING_STATUSES,
  ORDER_SHIPPING_STATUSES,
  getOrderPaymentBreakdown,
  isActiveOrderStatus,
  orderNeedsAttention,
  type ListOrdersModel,
  type OrderStatus,
} from "@/entities/order";
import { parseOrderDateTimestamp } from "./orderDate";

export type OrdersUserRole = "seller" | "customer";

export type OrdersFilterId =
  | "all"
  | "new"
  | "payment"
  | "processing"
  | "assembling"
  | "shipping"
  | "completed"
  | "disputed";

export type OrdersSortId = "attention" | "newest" | "oldest";

export interface OrdersFilterOption {
  id: OrdersFilterId;
  label: string;
}

export interface OrdersStatCounts {
  attention: number;
  active: number;
  completed: number;
  sellerConfirm: number;
  sellerShipping: number;
  customerShipping: number;
}

const SELLER_FILTERS: readonly OrdersFilterOption[] = [
  { id: "all", label: "Все" },
  { id: "new", label: "Новые" },
  { id: "payment", label: "Ожидают оплату" },
  { id: "assembling", label: "Собрать" },
  { id: "shipping", label: "В пути" },
  { id: "completed", label: "Завершены" },
  { id: "disputed", label: "Спорные" },
];

const CUSTOMER_FILTERS: readonly OrdersFilterOption[] = [
  { id: "all", label: "Все" },
  { id: "payment", label: "К оплате" },
  { id: "processing", label: "В обработке" },
  { id: "shipping", label: "В пути" },
  { id: "completed", label: "Завершены" },
  { id: "disputed", label: "Спорные" },
];

const SELLER_FILTER_STATUSES: Record<
  OrdersFilterId,
  readonly OrderStatus[] | undefined
> = {
  all: undefined,
  new: ORDER_NEW_STATUSES,
  payment: ORDER_PAYMENT_STATUSES,
  processing: ORDER_PROCESSING_STATUSES,
  assembling: ORDER_ASSEMBLING_STATUSES,
  shipping: ORDER_SHIPPING_STATUSES,
  completed: ORDER_COMPLETED_STATUSES,
  disputed: ORDER_DISPUTED_STATUSES,
};

const CUSTOMER_FILTER_STATUSES: Record<
  OrdersFilterId,
  readonly OrderStatus[] | undefined
> = {
  all: undefined,
  new: ORDER_NEW_STATUSES,
  payment: ORDER_PAYMENT_STATUSES,
  processing: ORDER_PROCESSING_STATUSES,
  assembling: ORDER_ASSEMBLING_STATUSES,
  shipping: ORDER_SHIPPING_STATUSES,
  completed: ORDER_COMPLETED_STATUSES,
  disputed: ORDER_DISPUTED_STATUSES,
};

export const getOrdersTitle = (userRole: OrdersUserRole) =>
  userRole === "seller" ? "Продажи" : "Покупки";

const priceFormatter = new Intl.NumberFormat("ru-RU");

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatOrderPrice = (order: ListOrdersModel) =>
  `${priceFormatter.format(getOrderPaymentBreakdown(order).productTotal)} ${
    order.product.currency
  }`;

export const formatOrderDate = (date: string) => {
  const timestamp = parseOrderDateTimestamp(date);

  if (timestamp === null) {
    return "Дата неизвестна";
  }

  return dateTimeFormatter.format(new Date(timestamp));
};

export const getOrderPeerLabel = (userRole: OrdersUserRole) =>
  userRole === "seller" ? "Покупатель" : "Продавец";

export const getOrdersFilters = (userRole: OrdersUserRole) =>
  userRole === "seller" ? SELLER_FILTERS : CUSTOMER_FILTERS;

export const getOrdersStatCounts = (
  orders: readonly ListOrdersModel[],
  userRole: OrdersUserRole,
): OrdersStatCounts => ({
  attention: orders.filter((order) =>
    orderNeedsAttention(order.actualStatus, userRole),
  ).length,
  active: orders.filter((order) => isActiveOrderStatus(order.actualStatus))
    .length,
  completed: orders.filter((order) =>
    ORDER_COMPLETED_STATUSES.includes(order.actualStatus),
  ).length,
  sellerConfirm: orders.filter((order) =>
    ORDER_NEW_STATUSES.includes(order.actualStatus) ||
    order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL",
  ).length,
  sellerShipping: orders.filter((order) =>
    ORDER_ASSEMBLING_STATUSES.includes(order.actualStatus),
  ).length,
  customerShipping: orders.filter((order) =>
    ORDER_SHIPPING_STATUSES.includes(order.actualStatus),
  ).length,
});

export const filterOrdersByStatus = (
  orders: readonly ListOrdersModel[],
  filterId: OrdersFilterId,
  userRole: OrdersUserRole,
) => {
  const statuses =
    userRole === "seller"
      ? SELLER_FILTER_STATUSES[filterId]
      : CUSTOMER_FILTER_STATUSES[filterId];

  if (!statuses) {
    return [...orders];
  }

  return orders.filter((order) => statuses.includes(order.actualStatus));
};

export const sortOrders = (
  orders: readonly ListOrdersModel[],
  sortId: OrdersSortId,
  userRole: OrdersUserRole,
) => {
  return [...orders].sort((first, second) => {
    if (sortId === "attention") {
      const firstNeedsAttention = orderNeedsAttention(
        first.actualStatus,
        userRole,
      );
      const secondNeedsAttention = orderNeedsAttention(
        second.actualStatus,
        userRole,
      );

      if (firstNeedsAttention !== secondNeedsAttention) {
        return firstNeedsAttention ? -1 : 1;
      }
    }

    const firstCreatedAt = parseOrderDateTimestamp(first.createdAt);
    const secondCreatedAt = parseOrderDateTimestamp(second.createdAt);

    if (firstCreatedAt === null || secondCreatedAt === null) {
      if (firstCreatedAt === secondCreatedAt) {
        return 0;
      }

      return firstCreatedAt === null ? 1 : -1;
    }

    if (sortId === "oldest") {
      return firstCreatedAt - secondCreatedAt;
    }

    return secondCreatedAt - firstCreatedAt;
  });
};

export const getOrdersFilterCount = (
  orders: readonly ListOrdersModel[],
  filterId: OrdersFilterId,
  userRole: OrdersUserRole,
) => filterOrdersByStatus(orders, filterId, userRole).length;

export const getAttentionOrders = (
  orders: readonly ListOrdersModel[],
  userRole: OrdersUserRole,
) =>
  sortOrders(
    orders.filter((order) => orderNeedsAttention(order.actualStatus, userRole)),
    "newest",
    userRole,
  );
