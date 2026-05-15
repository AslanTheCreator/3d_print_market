"use client";

import React, { useMemo, useState } from "react";
import { Alert, Box, Stack } from "@mui/material";
import { Receipt, Storefront } from "@mui/icons-material";
import { UseQueryResult } from "@tanstack/react-query";
import { ListOrdersModel, OrdersEmptyState } from "@/entities/order";
import { LoadingOrderState } from "@/shared/ui/states";
import { PageHeader } from "@/shared/ui/page-header";
import {
  filterOrdersByStatus,
  getAttentionOrders,
  getOrdersFilterCount,
  getOrdersFilters,
  getOrdersStatCounts,
  getOrdersTitle,
  searchOrders,
  sortOrders,
  type OrdersFilterId,
  type OrdersSortId,
  type OrdersUserRole,
} from "../model/dashboardOrders";
import { OrdersAttentionSection } from "./OrdersAttentionSection";
import { OrdersControls } from "./OrdersControls";
import { OrdersSummaryCards } from "./OrdersSummaryCards";
import { OrdersTable } from "./OrdersTable";

interface OrdersWidgetProps {
  query: UseQueryResult<ListOrdersModel[]>;
  userRole: OrdersUserRole;
}

export const OrdersWidget = ({ query, userRole }: OrdersWidgetProps) => {
  const [activeFilter, setActiveFilter] = useState<OrdersFilterId>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<OrdersSortId>("attention");
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
    const searchedOrders = searchOrders(filteredOrders, search);

    return sortOrders(searchedOrders, sort, userRole);
  }, [activeFilter, ordersList, search, sort, userRole]);

  if (isLoading) {
    return <LoadingOrderState title={title} itemsCount={3} />;
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
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
        />

        <OrdersAttentionSection
          orders={attentionOrders}
          userRole={userRole}
        />

        <OrdersTable
          orders={visibleOrders}
          totalCount={ordersList.length}
          userRole={userRole}
        />
      </Stack>
    </Box>
  );
};
