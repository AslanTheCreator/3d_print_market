"use client";

import React from "react";
import { alpha, Box, Paper, Stack, Typography, useTheme } from "@mui/material";
import {
  AccessTime,
  CheckCircle,
  Inventory2,
  LocalShipping,
  NotificationsActive,
  QueryStats,
} from "@mui/icons-material";
import type {
  OrdersStatCounts,
  OrdersUserRole,
} from "../model/dashboardOrders";

type StatColor = "primary" | "info" | "warning" | "success";

interface OrdersSummaryCardsProps {
  stats: OrdersStatCounts;
  userRole: OrdersUserRole;
}

export const OrdersSummaryCards = ({
  stats,
  userRole,
}: OrdersSummaryCardsProps) => {
  const theme = useTheme();
  const cards =
    userRole === "seller"
      ? [
          {
            label: "Нужно подтвердить",
            value: stats.sellerConfirm,
            color: "primary" as StatColor,
            Icon: NotificationsActive,
          },
          {
            label: "К отправке",
            value: stats.sellerShipping,
            color: "warning" as StatColor,
            Icon: Inventory2,
          },
          {
            label: "Активные продажи",
            value: stats.active,
            color: "info" as StatColor,
            Icon: QueryStats,
          },
          {
            label: "Завершены",
            value: stats.completed,
            color: "success" as StatColor,
            Icon: CheckCircle,
          },
        ]
      : [
          {
            label: "Требуют действия",
            value: stats.attention,
            color: "primary" as StatColor,
            Icon: NotificationsActive,
          },
          {
            label: "Активные",
            value: stats.active,
            color: "info" as StatColor,
            Icon: AccessTime,
          },
          {
            label: "В пути",
            value: stats.customerShipping,
            color: "warning" as StatColor,
            Icon: LocalShipping,
          },
          {
            label: "Завершены",
            value: stats.completed,
            color: "success" as StatColor,
            Icon: CheckCircle,
          },
        ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: 2,
      }}
    >
      {cards.map(({ label, value, color, Icon }) => {
        const mainColor = theme.palette[color].main;

        return (
          <Paper
            key={label}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: mainColor,
                  bgcolor: alpha(mainColor, 0.12),
                  flexShrink: 0,
                }}
              >
                <Icon />
              </Box>

              <Box minWidth={0}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  noWrap
                  title={label}
                >
                  {label}
                </Typography>
                <Typography variant="h5" fontWeight={800} color={mainColor}>
                  {value}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
};
