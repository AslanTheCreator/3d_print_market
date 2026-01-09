"use client";
import React, { useMemo } from "react";
import { Box, Paper, Stack, Typography, Skeleton } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { useOrderStatusDictionary } from "@/entities/order/lib/useOrderStatusDictionary";

type UserRole = "seller" | "customer";

interface OrderProgressProps {
  status: string;
  userRole: UserRole;
}

interface StepConfig {
  key: string;
  shortLabel: string; // Короткое название для UI
  sellerAction?: boolean;
  customerAction?: boolean;
  info?: boolean;
}

export const OrderProgress = ({ status, userRole }: OrderProgressProps) => {
  const { getStatusDescription, isLoading } = useOrderStatusDictionary();

  const stepsConfig: StepConfig[] = useMemo(
    () => [
      { key: "BOOKED", shortLabel: "Забронирован", sellerAction: true },
      {
        key: "AWAITING_PREPAYMENT",
        shortLabel: "Предоплата",
        customerAction: true,
      },
      {
        key: "AWAITING_PREPAYMENT_APPROVAL",
        shortLabel: "Подтверждение",
        sellerAction: true,
      },
      { key: "AWAITING_PAYMENT", shortLabel: "Оплата", customerAction: true },
      { key: "ASSEMBLING", shortLabel: "Сборка", sellerAction: true },
      { key: "ON_THE_WAY", shortLabel: "В пути", customerAction: true },
      { key: "COMPLETED", shortLabel: "Завершен", info: true },
    ],
    []
  );

  const steps = useMemo(
    () =>
      stepsConfig.map((config) => ({
        ...config,
        label: config.shortLabel,
        fullLabel: isLoading ? config.key : getStatusDescription(config.key),
      })),
    [stepsConfig, isLoading, getStatusDescription]
  );

  const currentStepIndex = steps.findIndex((step) => step.key === status);

  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
        <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
        <Stack direction="row" spacing={1}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Box key={i} sx={{ minWidth: 80, textAlign: "center" }}>
              <Skeleton
                variant="circular"
                width={24}
                height={24}
                sx={{ mx: "auto", mb: 1 }}
              />
              <Skeleton
                variant="text"
                width={60}
                height={20}
                sx={{ mx: "auto" }}
              />
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  }

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
              title={step.fullLabel} // Полное описание в tooltip
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
