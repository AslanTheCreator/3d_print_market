"use client";
import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { LocalShipping, LocationOn } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order";

interface DeliveryInfoProps {
  transfer: ListOrdersModel["transfer"];
}

export const DeliveryInfo = ({ transfer }: DeliveryInfoProps) => (
  <Box sx={{ mb: 2 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      <LocalShipping color="action" />
      <Typography variant="subtitle2" fontWeight={600}>
        Информация о доставке
      </Typography>
    </Stack>
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
      <LocationOn sx={{ fontSize: 16, mt: 0.5 }} color="action" />
      <Typography variant="body2" color="text.secondary">
        {transfer.address}
      </Typography>
    </Stack>
    <Typography variant="body2" color="primary.main" fontWeight={600}>
      Стоимость доставки: {transfer.price} {transfer.currency}
    </Typography>
  </Box>
);
