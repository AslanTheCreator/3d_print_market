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

const tableColumns = {
  gridTemplateColumns:
    "minmax(280px, 2fr) minmax(120px, 0.8fr) minmax(150px, 0.9fr) minmax(240px, 1.4fr) minmax(110px, 0.7fr) minmax(130px, 0.8fr) minmax(170px, 1fr)",
};

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

const OrderMobileCard = ({
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
        p: 1.5,
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

      {orders.length > 0 && (
        <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" } }}>
          {orders.map((order) => (
            <OrderMobileCard
              key={order.orderId}
              order={order}
              userRole={userRole}
            />
          ))}

          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
            Показано {orders.length} из {totalCount} заказов
          </Typography>
        </Stack>
      )}

      <Paper
        variant="outlined"
        sx={{
          display: { xs: orders.length === 0 ? "block" : "none", md: "block" },
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {orders.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Заказы не найдены
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Попробуйте изменить фильтр, сортировку или поисковый запрос.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 1200 }}>
              <Box
                sx={{
                  display: "grid",
                  ...tableColumns,
                  gap: 2,
                  px: 2,
                  py: 1.25,
                  bgcolor: alpha(theme.palette.grey[500], 0.06),
                }}
              >
                {[
                  "Заказ / товар",
                  getOrderPeerLabel(userRole),
                  "Статус",
                  "Оплата и доставка",
                  "Сумма",
                  "Дата",
                  "Действия",
                ].map((label) => (
                  <Typography
                    key={label}
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                  >
                    {label}
                  </Typography>
                ))}
              </Box>

              {orders.map((order) => (
                <Box
                  key={order.orderId}
                  sx={{
                    display: "grid",
                    ...tableColumns,
                    gap: 2,
                    alignItems: "center",
                    px: 2,
                    py: 1.5,
                    borderTop: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <OrderProductPreview
                    order={order}
                    userRole={userRole}
                    imageSize={56}
                  />

                  <Stack spacing={0.25} minWidth={0}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      noWrap
                      title={order.userInfo.login}
                    >
                      {order.userInfo.login}
                    </Typography>
                    {order.userInfo.mail && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        title={order.userInfo.mail}
                      >
                        {order.userInfo.mail}
                      </Typography>
                    )}
                  </Stack>

                  <Box
                    sx={{
                      minWidth: 0,
                      "& .MuiChip-root": { maxWidth: "100%" },
                      "& .MuiChip-label": {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      },
                    }}
                  >
                    <OrderStatusChip status={order.actualStatus} />
                  </Box>

                  <OrderMiniProgress order={order} />

                  <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    color="primary.main"
                  >
                    {formatOrderPrice(order)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {formatOrderDate(order.createdAt)}
                  </Typography>

                  {userRole === "seller" ? (
                    <SellerActions order={order} />
                  ) : (
                    <CustomerActions order={order} />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" color="text.secondary">
            Показано {orders.length} из {totalCount} заказов
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
