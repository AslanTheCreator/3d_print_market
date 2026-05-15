"use client";

import React from "react";
import { alpha, Box, Paper, Stack, Typography, useTheme } from "@mui/material";
import {
  getOrderStatusActionHint,
  OrderStatusChip,
  type ListOrdersModel,
} from "@/entities/order";
import {
  formatOrderDate,
  type OrdersUserRole,
} from "../model/dashboardOrders";
import { CustomerActions } from "./CustomerActions";
import { OrderProductPreview } from "./OrderProductPreview";
import { SellerActions } from "./SellerActions";

interface OrdersAttentionSectionProps {
  orders: readonly ListOrdersModel[];
  userRole: OrdersUserRole;
}

export const OrdersAttentionSection = ({
  orders,
  userRole,
}: OrdersAttentionSectionProps) => {
  const theme = useTheme();

  if (orders.length === 0) {
    return null;
  }

  const title = userRole === "seller" ? "Очередь продавца" : "Требуют внимания";

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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: userRole === "seller" ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {orders.map((order) => {
          const hint = getOrderStatusActionHint(order.actualStatus, userRole);

          return (
            <Paper
              key={order.orderId}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderColor: alpha(theme.palette.primary.main, 0.35),
                bgcolor: alpha(theme.palette.primary.main, 0.03),
              }}
            >
              <Stack spacing={1.5} height="100%">
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textAlign="right"
                  >
                    {formatOrderDate(order.createdAt)}
                  </Typography>
                </Stack>

                <OrderProductPreview
                  order={order}
                  userRole={userRole}
                  imageSize={74}
                />

                {hint && (
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Следующий шаг:
                    </Typography>
                    <Typography variant="body2">{hint}</Typography>
                  </Box>
                )}

                {userRole === "seller" ? (
                  <SellerActions order={order} />
                ) : (
                  <CustomerActions order={order} />
                )}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};
