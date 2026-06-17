import {
  isActiveOrderStatus,
  orderNeedsAttention,
  type ListOrdersModel,
  type OrderStatus,
} from "@/entities/order";

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
  new: ["BOOKED"],
  payment: ["AWAITING_PREPAYMENT", "AWAITING_PAYMENT"],
  processing: ["BOOKED", "AWAITING_PREPAYMENT_APPROVAL", "ASSEMBLING"],
  assembling: ["ASSEMBLING"],
  shipping: ["ON_THE_WAY"],
  completed: ["COMPLETED"],
  disputed: ["DISPUTED", "FAILED"],
};

const CUSTOMER_FILTER_STATUSES: Record<
  OrdersFilterId,
  readonly OrderStatus[] | undefined
> = {
  all: undefined,
  new: ["BOOKED"],
  payment: ["AWAITING_PREPAYMENT", "AWAITING_PAYMENT"],
  processing: ["BOOKED", "AWAITING_PREPAYMENT_APPROVAL", "ASSEMBLING"],
  assembling: ["ASSEMBLING"],
  shipping: ["ON_THE_WAY"],
  completed: ["COMPLETED"],
  disputed: ["DISPUTED", "FAILED"],
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
  `${priceFormatter.format(order.totalPrice)} ${order.product.currency}`;

export const formatOrderDate = (date: string) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Дата неизвестна";
  }

  return dateTimeFormatter.format(parsedDate);
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
  completed: orders.filter((order) => order.actualStatus === "COMPLETED")
    .length,
  sellerConfirm: orders.filter((order) =>
    ["BOOKED", "AWAITING_PREPAYMENT_APPROVAL"].includes(order.actualStatus),
  ).length,
  sellerShipping: orders.filter((order) => order.actualStatus === "ASSEMBLING")
    .length,
  customerShipping: orders.filter((order) => order.actualStatus === "ON_THE_WAY")
    .length,
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

    const firstCreatedAt = new Date(first.createdAt).getTime();
    const secondCreatedAt = new Date(second.createdAt).getTime();

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
