"use client";

import React, { useMemo, useState } from "react";
import { Alert, Box, Stack } from "@mui/material";
import { Receipt, Storefront } from "@mui/icons-material";
import { UseQueryResult } from "@tanstack/react-query";
import { ListOrdersModel, OrdersEmptyState } from "@/entities/order";
import { PageHeader } from "@/shared/ui/page-header";
import {
  filterOrdersByStatus,
  getAttentionOrders,
  getOrdersFilterCount,
  getOrdersFilters,
  getOrdersStatCounts,
  getOrdersTitle,
  sortOrders,
  type OrdersFilterId,
  type OrdersSortId,
  type OrdersUserRole,
} from "../model/dashboardOrders";
import { OrdersAttentionSection } from "./OrdersAttentionSection";
import { OrdersControls } from "./OrdersControls";
import { OrdersLoadingSkeleton } from "./OrdersLoadingSkeleton";
import { OrdersSummaryCards } from "./OrdersSummaryCards";
import { OrdersTable } from "./OrdersTable";
import { OrderDetailsDialog } from "./OrderDetailsDialog";

interface OrdersWidgetProps {
  query: UseQueryResult<ListOrdersModel[]>;
  userRole: OrdersUserRole;
}

export const OrdersWidget = ({ query, userRole }: OrdersWidgetProps) => {
  const [activeFilter, setActiveFilter] = useState<OrdersFilterId>("all");
  const [sort, setSort] = useState<OrdersSortId>("attention");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { data: orders, isLoading, error } = query;

  const title = getOrdersTitle(userRole);
  const Icon = userRole === "seller" ? Storefront : Receipt;

  const ordersList = useMemo(
    () => (Array.isArray(orders) ? orders : []),
    [orders],
  );

  const filters = useMemo(() => getOrdersFilters(userRole), [userRole]);

  const stats = useMemo(
    () => getOrdersStatCounts(ordersList, userRole),
    [ordersList, userRole],
  );

  const filterCounts = useMemo(() => {
    const counts = {} as Record<OrdersFilterId, number>;

    filters.forEach((filter) => {
      counts[filter.id] = getOrdersFilterCount(ordersList, filter.id, userRole);
    });

    return counts;
  }, [filters, ordersList, userRole]);

  const attentionOrders = useMemo(
    () =>
      getAttentionOrders(ordersList, userRole).slice(
        0,
        userRole === "seller" ? 3 : 2,
      ),
    [ordersList, userRole],
  );

  const visibleOrders = useMemo(() => {
    const filteredOrders = filterOrdersByStatus(
      ordersList,
      activeFilter,
      userRole,
    );

    return sortOrders(filteredOrders, sort, userRole);
  }, [activeFilter, ordersList, sort, userRole]);

  const selectedOrder = useMemo(
    () =>
      selectedOrderId === null
        ? null
        : (ordersList.find((order) => order.orderId === selectedOrderId) ??
          null),
    [ordersList, selectedOrderId],
  );

  if (isLoading) {
    return <OrdersLoadingSkeleton title={title} icon={<Icon />} />;
  }

  if (error) {
    return (
      <Box sx={{ width: "100%", py: { xs: 2, sm: 3 } }}>
        <PageHeader title={title} icon={<Icon />} />
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Не удалось загрузить заказы. Попробуйте обновить страницу.
        </Alert>
      </Box>
    );
  }

  if (ordersList.length === 0) {
    return (
      <Box sx={{ width: "100%", py: { xs: 2, sm: 3 } }}>
        <PageHeader title={title} icon={<Icon />} />
        <OrdersEmptyState userRole={userRole} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", py: { xs: 2, sm: 3 } }}>
      <PageHeader title={title} icon={<Icon />} />
      <Stack spacing={{ xs: 2, sm: 3 }}>
        <OrdersSummaryCards stats={stats} userRole={userRole} />

        <OrdersControls
          filters={filters}
          filterCounts={filterCounts}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sort={sort}
          onSortChange={setSort}
        />

        <OrdersAttentionSection
          orders={attentionOrders}
          userRole={userRole}
          onOpenDetails={(order) => setSelectedOrderId(order.orderId)}
        />

        <OrdersTable
          orders={visibleOrders}
          totalCount={ordersList.length}
          userRole={userRole}
          onOpenDetails={(order) => setSelectedOrderId(order.orderId)}
        />
      </Stack>

      {selectedOrder && (
        <OrderDetailsDialog
          open
          order={selectedOrder}
          userRole={userRole}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </Box>
  );
};
