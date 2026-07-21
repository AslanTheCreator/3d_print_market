"use client";

import { Alert, Box, Stack, Typography } from "@mui/material";
import { HistoryOutlined } from "@mui/icons-material";
import { OrderStatusChip, type ListOrdersModel } from "@/entities/order";
import { formatOrderDate } from "../model/dashboardOrders";
import { sortOrderHistories } from "../model/orderDetails";
import { OrderDetailsSection } from "./OrderDetailsSection";

export const OrderHistory = ({ order }: { order: ListOrdersModel }) => {
  const histories = sortOrderHistories(order.histories);

  return (
    <OrderDetailsSection
      title="История заказа"
      icon={<HistoryOutlined />}
      testId="order-history"
    >
      {histories.length === 0 ? (
        <Alert severity="info">История заказа пока пуста.</Alert>
      ) : (
        <Stack spacing={0}>
          {histories.map((history, index) => {
            const isLast = index === histories.length - 1;

            return (
              <Stack
                key={`${history.status}-${history.changedAt}-${index}`}
                direction="row"
                spacing={1.5}
                alignItems="stretch"
              >
                <Box
                  sx={{
                    position: "relative",
                    width: 12,
                    flexShrink: 0,
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 9,
                      left: 2,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                    },
                    ...(!isLast && {
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        top: 20,
                        bottom: 0,
                        left: 5.5,
                        width: 1,
                        bgcolor: "divider",
                      },
                    }),
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1, pb: isLast ? 0 : 2 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 0.5, sm: 1 }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <OrderStatusChip status={history.status} />
                    <Typography variant="caption" color="text.secondary">
                      {formatOrderDate(history.changedAt)}
                    </Typography>
                  </Stack>
                  {history.comment.trim() && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}
                    >
                      {history.comment}
                    </Typography>
                  )}
                </Box>
              </Stack>
            );
          })}
        </Stack>
      )}
    </OrderDetailsSection>
  );
};
