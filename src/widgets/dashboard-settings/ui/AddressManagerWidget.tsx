"use client";

import React from "react";
import { Box, Alert, AlertTitle, Card, CardContent } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { AddressManager } from "./AddressManager";
import { useAddresses } from "@/entities/address";

export const AddressManagerWidget: React.FC = () => {
  const { data: addresses = [] } = useAddresses();
  const hasAddresses = addresses.length > 0;

  return (
    <Box>
      {/* Инфо */}
      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{
          mb: { xs: 2, sm: 3 },
          borderRadius: 2,
          "& .MuiAlert-message": {
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
        }}
      >
        <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
          Адрес доставки
        </AlertTitle>
        {hasAddresses
          ? "Управляйте вашими адресами доставки."
          : "Добавьте адрес для доставки товаров."}
      </Alert>

      {/* Контейнер с адресами */}
      <Card
        elevation={0}
        sx={{
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
          <AddressManager />
        </CardContent>
      </Card>
    </Box>
  );
};
