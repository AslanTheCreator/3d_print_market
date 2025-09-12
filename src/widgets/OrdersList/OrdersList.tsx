"use client";
import React from "react";
import { Container, Typography, Alert, Box, Stack, Chip } from "@mui/material";
import { UseQueryResult } from "@tanstack/react-query";
import { ListOrdersModel } from "@/entities/order/model/types";
import { LoadingState } from "@/shared/ui";
import { OrderCard, OrdersEmptyState } from "@/entities/order";

type UserRole = "seller" | "customer";

interface OrdersListProps {
  title: string;
  query: UseQueryResult<ListOrdersModel[]>;
  userRole: UserRole;
}

export const OrdersList = ({ title, query, userRole }: OrdersListProps) => {
  const { data: orders, isLoading, error } = query;

  // Состояние загрузки
  if (isLoading) {
    return <LoadingState title={title} itemsCount={3} />;
  }

  // Состояние ошибки
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          Ошибка при загрузке заказов. Попробуйте обновить страницу.
        </Alert>
      </Container>
    );
  }

  const ordersList: ListOrdersModel[] = Array.isArray(orders) ? orders : [];

  // Пустое состояние
  if (ordersList.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          {title}
        </Typography>
        <OrdersEmptyState userRole={userRole} />
      </Container>
    );
  }

  // Подсчет заказов, требующих внимания
  const ordersNeedingAttention = ordersList.filter(
    (order) =>
      (userRole === "seller" &&
        ["BOOKED", "ASSEMBLING"].includes(order.actualStatus)) ||
      (userRole === "customer" &&
        ["AWAITING_PAYMENT", "ON_THE_WAY"].includes(order.actualStatus))
  );

  // Сортировка: сначала заказы, требующие внимания, затем по дате создания
  const sortedOrders = [...ordersList].sort((a, b) => {
    const aNeedsAttention = ordersNeedingAttention.includes(a);
    const bNeedsAttention = ordersNeedingAttention.includes(b);

    if (aNeedsAttention && !bNeedsAttention) return -1;
    if (!aNeedsAttention && bNeedsAttention) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        {title}
      </Typography>

      {/* Статистика заказов */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        sx={{ mb: 3 }}
      >
        <Typography variant="body2" color="text.secondary">
          Всего заказов: {ordersList.length}
        </Typography>
        {ordersNeedingAttention.length > 0 && (
          <Chip
            label={`Требует внимания: ${ordersNeedingAttention.length}`}
            color="warning"
            size="small"
            variant="outlined"
          />
        )}
      </Stack>

      {/* Список заказов */}
      <Box>
        {sortedOrders.map((order) => (
          <OrderCard key={order.orderId} order={order} userRole={userRole} />
        ))}
      </Box>
    </Container>
  );
};
