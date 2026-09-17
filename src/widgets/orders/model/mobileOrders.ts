import {
  getSellerOrderActionFlags,
  isActiveOrderStatus,
  orderNeedsAttention,
  type ListOrdersModel,
} from "@/entities/order";
import {
  filterOrdersByStatus,
  getOrdersFilters,
  sortOrders,
  type OrdersFilterId,
  type OrdersSortId,
  type OrdersUserRole,
} from "./dashboardOrders";

export type MobileOrdersFilterId = OrdersFilterId | "active" | "attention" | "confirmation";

export const getMobileOrdersFilters = (role: OrdersUserRole) => {
  const extra = role === "seller"
    ? [{ id: "confirmation" as const, label: "Нужно подтвердить" }]
    : [
        { id: "active" as const, label: "Активные" },
        { id: "attention" as const, label: "Требуют действия" },
      ];
  return [
    { id: "all" as const, label: "Все" },
    ...extra,
    ...getOrdersFilters(role)
      .filter((filter) => filter.id !== "all" && filter.id !== "new")
      .map((filter) => filter.id === "assembling" ? { ...filter, label: "К отправке" } : filter),
  ];
};

export const filterMobileOrders = (
  orders: readonly ListOrdersModel[],
  filter: MobileOrdersFilterId,
  role: OrdersUserRole,
) => {
  if (filter === "active") return orders.filter((order) => isActiveOrderStatus(order.actualStatus));
  if (filter === "attention") return orders.filter((order) => orderNeedsAttention(order.actualStatus, role));
  if (filter === "confirmation") {
    return orders.filter((order) => {
      const flags = getSellerOrderActionFlags(order.actualStatus);
      return flags.canConfirmOrder || flags.canConfirmPreOrder;
    });
  }
  return filterOrdersByStatus(orders, filter, role);
};

export const sortMobileOrders = (
  orders: readonly ListOrdersModel[],
  sort: OrdersSortId,
  role: OrdersUserRole,
) => {
  const sorted = sortOrders(orders, sort, role);
  if (sort !== "attention") return sorted;
  const priority = (order: ListOrdersModel) =>
    orderNeedsAttention(order.actualStatus, role) ? 0 : isActiveOrderStatus(order.actualStatus) ? 1 : 2;
  return sorted.sort((first, second) => priority(first) - priority(second));
};
