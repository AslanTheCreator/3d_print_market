"use client";
import React, { useMemo } from "react";
import { Box, Stack, Typography, Skeleton, Tooltip } from "@mui/material";
import { CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import { useOrderStatusDictionary } from "../lib/useOrderStatusDictionary";

type UserRole = "seller" | "customer";

interface OrderProgressProps {
  status: string;
  userRole: UserRole;
  isPreorder?: boolean;
}

interface StepConfig {
  key: string;
  label: string;
  sellerAction?: boolean;
  customerAction?: boolean;
}

export const OrderProgress: React.FC<OrderProgressProps> = ({
  status,
  userRole,
  isPreorder = false,
}) => {
  const { getStatusDescription, isLoading } = useOrderStatusDictionary();

  // Конфигурация шагов для обычных товаров
  const regularSteps: StepConfig[] = useMemo(
    () => [
      { key: "BOOKED", label: "Забронирован", sellerAction: true },
      { key: "AWAITING_PAYMENT", label: "Оплата", customerAction: true },
      { key: "ASSEMBLING", label: "Сборка", sellerAction: true },
      { key: "ON_THE_WAY", label: "В пути", customerAction: true },
      { key: "COMPLETED", label: "Завершен" },
    ],
    []
  );

  // Конфигурация шагов для предзаказов
  const preorderSteps: StepConfig[] = useMemo(
    () => [
      { key: "BOOKED", label: "Забронирован", sellerAction: true },
      { key: "AWAITING_PREPAYMENT", label: "Предоплата", customerAction: true },
      {
        key: "AWAITING_PREPAYMENT_APPROVAL",
        label: "Подтверждение",
        sellerAction: true,
      },
      { key: "AWAITING_PAYMENT", label: "Оплата", customerAction: true },
      { key: "ASSEMBLING", label: "Сборка", sellerAction: true },
      { key: "ON_THE_WAY", label: "В пути", customerAction: true },
      { key: "COMPLETED", label: "Завершен" },
    ],
    []
  );

  const steps = isPreorder ? preorderSteps : regularSteps;

  const currentStepIndex = steps.findIndex((step) => step.key === status);

  if (isLoading) {
    return (
      <Box sx={{ py: 1 }}>
        <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
        <Stack direction="row" spacing={0.5}>
          {steps.map((_, i) => (
            <Skeleton
              key={i}
              variant="circular"
              width={24}
              height={24}
              sx={{ flex: 1 }}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1, display: "block", fontWeight: 600 }}
      >
        Статус заказа
      </Typography>

      <Stack direction="row" spacing={0.5} alignItems="center">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          const needsAction =
            isActive &&
            ((step.sellerAction && userRole === "seller") ||
              (step.customerAction && userRole === "customer"));

          return (
            <Tooltip
              key={step.key}
              title={getStatusDescription(step.key)}
              arrow
              placement="top"
            >
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* Соединительная линия */}
                {index < steps.length - 1 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: "50%",
                      right: "-50%",
                      height: 2,
                      bgcolor: isCompleted ? "success.main" : "divider",
                      zIndex: 0,
                    }}
                  />
                )}

                {/* Иконка статуса */}
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
                    zIndex: 1,
                    position: "relative",
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle sx={{ fontSize: 16, color: "white" }} />
                  ) : isActive ? (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "white",
                      }}
                    />
                  ) : (
                    <RadioButtonUnchecked
                      sx={{ fontSize: 16, color: "grey.500" }}
                    />
                  )}
                </Box>

                {/* Название шага */}
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    mt: 0.5,
                    fontSize: "0.65rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? needsAction
                        ? "warning.main"
                        : "primary.main"
                      : "text.secondary",
                    lineHeight: 1.2,
                  }}
                >
                  {step.label}
                </Typography>

                {/* Индикатор необходимости действия */}
                {needsAction && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "warning.main",
                      mt: 0.25,
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
};
