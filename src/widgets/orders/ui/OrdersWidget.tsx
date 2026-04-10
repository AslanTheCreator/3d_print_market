"use client";
import React, { useMemo } from "react";
import {
  Container,
  Typography,
  Alert,
  Box,
  Stack,
  Chip,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { UseQueryResult } from "@tanstack/react-query";
import {
  ListOrdersModel,
  isActiveOrderStatus,
  orderNeedsAttention,
} from "@/entities/order";
import { LoadingOrderState } from "@/shared/ui/states";
import { OrdersEmptyState } from "@/entities/order";
import { Receipt, Storefront } from "@mui/icons-material";
import { OrderCard } from "./OrderCard";

type UserRole = "seller" | "customer";

interface OrdersWidgetProps {
  query: UseQueryResult<ListOrdersModel[]>;
  userRole: UserRole;
}

export const OrdersWidget: React.FC<OrdersWidgetProps> = ({
  query,
  userRole,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: orders, isLoading, error } = query;

  const title = userRole === "seller" ? "Продажи" : "Покупки";
  const Icon = userRole === "seller" ? Storefront : Receipt;

  // Обработка данных
  const ordersList: ListOrdersModel[] = useMemo(
    () => (Array.isArray(orders) ? orders : []),
    [orders],
  );

  // Подсчет заказов, требующих внимания
  const preparedOrders = useMemo(
    () =>
      ordersList.map((order) => ({
        order,
        needsAttention: orderNeedsAttention(order.actualStatus, userRole),
      })),
    [ordersList, userRole],
  );

  const ordersNeedingAttentionCount = useMemo(() => {
    return preparedOrders.filter((item) => item.needsAttention).length;
  }, [preparedOrders]);

  // Сортировка: важные → по дате
  const sortedOrders = useMemo(() => {
    return [...preparedOrders]
      .sort((a, b) => {
        if (a.needsAttention !== b.needsAttention) {
          return a.needsAttention ? -1 : 1;
        }

        return (
          new Date(b.order.createdAt).getTime() -
          new Date(a.order.createdAt).getTime()
        );
      })
      .map((item) => item.order);
  }, [preparedOrders]);

  // Статистика
  const stats = useMemo(() => {
    const total = ordersList.length;
    const active = ordersList.filter((o) =>
      isActiveOrderStatus(o.actualStatus),
    ).length;
    const completed = ordersList.filter(
      (o) => o.actualStatus === "COMPLETED",
    ).length;

    return { total, active, completed };
  }, [ordersList]);

  // Загрузка
  if (isLoading) {
    return <LoadingOrderState title={title} itemsCount={3} />;
  }

  // Ошибка
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
          {title}
        </Typography>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Не удалось загрузить заказы. Попробуйте обновить страницу.
        </Alert>
      </Container>
    );
  }

  // Пустое состояние
  if (ordersList.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          gutterBottom
          sx={{ mb: 3 }}
        >
          {title}
        </Typography>
        <OrdersEmptyState userRole={userRole} />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Заголовок */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        <Icon sx={{ fontSize: { xs: 28, sm: 32 }, color: "primary.main" }} />
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight={700}>
          {title}
        </Typography>
      </Stack>

      {/* Статистика */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          spacing={{ xs: 2, sm: 3 }}
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
            >
              Всего
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {stats.total}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
            >
              Активных
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {stats.active}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
            >
              Завершено
            </Typography>
            <Typography variant="h6" fontWeight={700} color="success.main">
              {stats.completed}
            </Typography>
          </Box>

          {ordersNeedingAttentionCount > 0 && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Chip
                label={`Требует действия: ${ordersNeedingAttentionCount}`}
                color="warning"
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                }}
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Список заказов */}
      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        {sortedOrders.map((order) => (
          <OrderCard key={order.orderId} order={order} userRole={userRole} />
        ))}
      </Stack>
    </Container>
  );
};
