"use client";
import React from "react";
import { Box, Stack, Typography, Chip } from "@mui/material";
import { LocationOn, LocalShipping } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order";

interface DeliveryInfoProps {
  transfer: ListOrdersModel["transfer"];
}

export const DeliveryInfo: React.FC<DeliveryInfoProps> = ({ transfer }) => {
  return (
    <Box>
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ mb: 0.75 }}
      >
        <LocalShipping sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
        >
          Доставка
        </Typography>
        <Chip
          label={
            transfer.price === 0
              ? "Бесплатно"
              : `${transfer.price} ${transfer.currency}`
          }
          size="small"
          color={transfer.price === 0 ? "success" : "default"}
          sx={{ height: 18, fontSize: "0.65rem" }}
        />
      </Stack>

      <Stack direction="row" spacing={0.75} alignItems="flex-start">
        <LocationOn sx={{ fontSize: 16, color: "text.secondary", mt: 0.25 }} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontSize: { xs: "0.7rem", sm: "0.75rem" },
            lineHeight: 1.4,
          }}
        >
          {transfer.address}
        </Typography>
      </Stack>
    </Box>
  );
};
