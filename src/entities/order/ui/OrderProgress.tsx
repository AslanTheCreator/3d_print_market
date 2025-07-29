"use client";
import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";

type UserRole = "seller" | "customer";

interface OrderProgressProps {
  status: string;
  userRole: UserRole;
}

export const OrderProgress = ({ status, userRole }: OrderProgressProps) => {
  const steps = [
    { key: "BOOKED", label: "Забронирован", sellerAction: true },
    {
      key: "AWAITING_PREPAYMENT",
      label: "Предоплачен",
      customerAction: true,
    },
    {
      key: "AWAITING_PREPAYMENT_APPROVAL",
      label: "Подтверждение предоплаты",
      sellerAction: true,
    },
    { key: "AWAITING_PAYMENT", label: "Ожидает оплату", customerAction: true },
    { key: "ASSEMBLING", label: "Собирается", sellerAction: true },
    { key: "ON_THE_WAY", label: "В пути", customerAction: true },
    { key: "COMPLETED", label: "Завершен", info: true },
  ];

  const currentStepIndex = steps.findIndex((step) => step.key === status);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
        Прогресс заказа
      </Typography>
      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          const needsAction =
            isActive &&
            ((step.sellerAction && userRole === "seller") ||
              (step.customerAction && userRole === "customer"));

          return (
            <Box
              key={step.key}
              sx={{
                minWidth: 80,
                textAlign: "center",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: isCompleted
                    ? "success.main"
                    : isActive
                    ? needsAction
                      ? "warning.main"
                      : "primary.main"
                    : "grey.300",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1,
                }}
              >
                {isCompleted ? (
                  <CheckCircle sx={{ fontSize: 16, color: "white" }} />
                ) : (
                  <Typography variant="caption" color="white" fontWeight={600}>
                    {index + 1}
                  </Typography>
                )}
              </Box>
              <Typography
                variant="caption"
                color={isActive ? "primary.main" : "text.secondary"}
                fontWeight={isActive ? 600 : 400}
                sx={{ display: "block", lineHeight: 1.2 }}
              >
                {step.label}
              </Typography>
              {needsAction && (
                <Typography
                  variant="caption"
                  color="warning.main"
                  fontWeight={600}
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Требует действия
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};
