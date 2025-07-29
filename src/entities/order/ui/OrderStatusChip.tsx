"use client";
import React from "react";
import { Chip } from "@mui/material";
import {
  AccessTime,
  Payment,
  ShoppingCart,
  LocalShipping,
  CheckCircle,
  Warning,
  Cancel,
} from "@mui/icons-material";

interface OrderStatusChipProps {
  status: string;
}

export const OrderStatusChip = ({ status }: OrderStatusChipProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "BOOKED":
        return {
          color: "warning" as const,
          label: "Забронирован",
          icon: <AccessTime sx={{ fontSize: 16 }} />,
        };
      case "AWAITING_PREPAYMENT":
        return {
          color: "info" as const,
          label: "Предоплачен",
          icon: <Payment sx={{ fontSize: 16 }} />,
        };
      case "AWAITING_PREPAYMENT_APPROVAL":
        return {
          color: "info" as const,
          label: "Подтверждение предоплаты",
          icon: <Payment sx={{ fontSize: 16 }} />,
        };
      case "AWAITING_PAYMENT":
        return {
          color: "info" as const,
          label: "Ожидает оплату",
          icon: <Payment sx={{ fontSize: 16 }} />,
        };
      case "ASSEMBLING":
        return {
          color: "primary" as const,
          label: "Собирается",
          icon: <ShoppingCart sx={{ fontSize: 16 }} />,
        };
      case "ON_THE_WAY":
        return {
          color: "primary" as const,
          label: "В пути",
          icon: <LocalShipping sx={{ fontSize: 16 }} />,
        };
      case "COMPLETED":
        return {
          color: "success" as const,
          label: "Завершен",
          icon: <CheckCircle sx={{ fontSize: 16 }} />,
        };
      case "DISPUTED":
        return {
          color: "error" as const,
          label: "Спор",
          icon: <Warning sx={{ fontSize: 16 }} />,
        };
      case "FAILED":
        return {
          color: "error" as const,
          label: "Отменен",
          icon: <Cancel sx={{ fontSize: 16 }} />,
        };
      default:
        return {
          color: "default" as const,
          label: status,
          icon: null,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="filled"
      icon={config.icon ?? undefined}
      sx={{ minWidth: 120 }}
    />
  );
};
