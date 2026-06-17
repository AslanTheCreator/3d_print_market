"use client";

import React from "react";
import { alpha, Box, Paper, Stack, Typography, useTheme } from "@mui/material";
import {
  getOrderProgressSteps,
  OrderStatusChip,
  shouldShowOrderProgress,
  type ListOrdersModel,
  type OrderProgressStep,
} from "@/entities/order";
import {
  formatOrderDate,
  formatOrderPrice,
  getOrderPeerLabel,
  type OrdersUserRole,
} from "../model/dashboardOrders";
import { CustomerActions } from "./CustomerActions";
import { OrderProductPreview } from "./OrderProductPreview";
import { SellerActions } from "./SellerActions";

interface OrdersTableProps {
  orders: readonly ListOrdersModel[];
  totalCount: number;
  userRole: OrdersUserRole;
}

const getStepIndex = (
  steps: readonly OrderProgressStep[],
  order: ListOrdersModel,
) => {
  if (order.actualStatus === "COMPLETED") {
    return steps.length - 1;
  }

  if (["FAILED", "DISPUTED"].includes(order.actualStatus)) {
    return -1;
  }

  return steps.findIndex((step) => step.key === order.actualStatus);
};

const OrderMiniProgress = ({ order }: { order: ListOrdersModel }) => {
  const theme = useTheme();
  const isPreorder = order.product.availability === "PREORDER";
  const shouldShowProgress = shouldShowOrderProgress(
    order.actualStatus,
    isPreorder,
  );

  if (!shouldShowProgress) {
    return (
      <Typography variant="caption" color="text.secondary">
        Этапы появятся после оплаты
      </Typography>
    );
  }

  const steps = getOrderProgressSteps(isPreorder);
  const activeIndex = getStepIndex(steps, order);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        {steps.map((step, index) => {
          const isCompleted = activeIndex >= index;
          const color = isCompleted
            ? theme.palette.primary.main
            : theme.palette.grey[300];

          return (
            <Box
              key={step.key}
              sx={{
                display: "flex",
                alignItems: "center",
                flex: index === steps.length - 1 ? "0 0 auto" : "1 1 0",
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: color,
                  border: `2px solid ${color}`,
                  flexShrink: 0,
                }}
              />
              {index < steps.length - 1 && (
                <Box
                  sx={{
                    height: 2,
                    flex: 1,
                    bgcolor: isCompleted
                      ? alpha(theme.palette.primary.main, 0.65)
                      : theme.palette.grey[300],
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          gap: 0.5,
          mt: 0.5,
        }}
      >
        {steps.map((step) => (
          <Typography
            key={step.key}
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: "0.65rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={step.label}
          >
            {step.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

const OrderInfoItem = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <Box
    sx={{
      minWidth: 0,
      p: 1,
      borderRadius: 1.5,
      bgcolor: "grey.50",
    }}
  >
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        display: "block",
        mb: 0.25,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      fontWeight={highlight ? 800 : 700}
      color={highlight ? "primary.main" : "text.primary"}
      sx={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={value}
    >
      {value}
    </Typography>
  </Box>
);

const OrderCard = ({
  order,
  userRole,
}: {
  order: ListOrdersModel;
  userRole: OrdersUserRole;
}) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        bgcolor: "background.paper",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Box
            sx={{
              minWidth: 0,
              "& .MuiChip-root": {
                maxWidth: "100%",
                minWidth: 0,
              },
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          >
            <OrderStatusChip status={order.actualStatus} />
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="right"
            sx={{ flexShrink: 0 }}
          >
            {formatOrderDate(order.createdAt)}
          </Typography>
        </Stack>

        <OrderProductPreview
          order={order}
          userRole={userRole}
          imageSize={78}
          showCategory={false}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          <OrderInfoItem
            label={getOrderPeerLabel(userRole)}
            value={order.userInfo.login}
          />
          <OrderInfoItem
            label="Сумма"
            value={formatOrderPrice(order)}
            highlight
          />
        </Box>

        <Box
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            bgcolor: alpha(theme.palette.primary.main, 0.035),
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.75 }}
          >
            Статус заказа
          </Typography>
          <OrderMiniProgress order={order} />
        </Box>

        <Box
          sx={{
            "& .MuiButton-root": {
              minHeight: 38,
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 800,
            },
          }}
        >
          {userRole === "seller" ? (
            <SellerActions order={order} />
          ) : (
            <CustomerActions order={order} />
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

export const OrdersTable = ({
  orders,
  totalCount,
  userRole,
}: OrdersTableProps) => {
  const theme = useTheme();
  const title = userRole === "seller" ? "Все продажи" : "Все покупки";

  return (
    <Box>
      <Typography
        variant="h6"
        fontWeight={800}
        sx={{
          mb: 1.5,
          pl: 1.5,
          borderLeft: `4px solid ${theme.palette.primary.main}`,
        }}
      >
        {title}
      </Typography>

      {orders.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Заказы не найдены
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Попробуйте изменить фильтр или сортировку.
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Stack spacing={1.25}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
              gap: 1.5,
            }}
          >
            {orders.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                userRole={userRole}
              />
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
            Показано {orders.length} из {totalCount} заказов
          </Typography>
        </Stack>
      )}
    </Box>
  );
};
