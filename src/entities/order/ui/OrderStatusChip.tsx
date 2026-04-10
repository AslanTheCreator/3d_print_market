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
import { getOrderStatusMeta } from "../lib/orderStatusMeta";
import type { OrderStatus } from "../model/types";

interface OrderStatusChipProps {
  status: OrderStatus;
}

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case "BOOKED":
      return <AccessTime sx={{ fontSize: 16 }} />;
    case "AWAITING_PREPAYMENT":
    case "AWAITING_PREPAYMENT_APPROVAL":
    case "AWAITING_PAYMENT":
      return <Payment sx={{ fontSize: 16 }} />;
    case "ASSEMBLING":
      return <ShoppingCart sx={{ fontSize: 16 }} />;
    case "ON_THE_WAY":
      return <LocalShipping sx={{ fontSize: 16 }} />;
    case "COMPLETED":
      return <CheckCircle sx={{ fontSize: 16 }} />;
    case "DISPUTED":
      return <Warning sx={{ fontSize: 16 }} />;
    case "FAILED":
      return <Cancel sx={{ fontSize: 16 }} />;
    default:
      return null;
  }
};

export const OrderStatusChip = ({ status }: OrderStatusChipProps) => {
  const meta = getOrderStatusMeta(status);

  return (
    <Chip
      label={meta.label}
      color={meta.chipColor}
      size="small"
      variant="filled"
      icon={getStatusIcon(status) ?? undefined}
      sx={{ minWidth: 120 }}
    />
  );
};
