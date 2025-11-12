// widgets/transfer-settings/ui/ShippingMethodWidget.tsx
"use client";

import React from "react";
import { Box, Alert, CircularProgress } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { ShippingMethodForm } from "./TransferForm";
import { useShoppingMethods } from "@/entities/dictionary";

interface ShippingMethodWidgetProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export const ShippingMethodWidget: React.FC<ShippingMethodWidgetProps> = ({
  onSuccess,
  onError,
}) => {
  const { data: shippingMethods, isLoading, error } = useShoppingMethods();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить способы доставки. Попробуйте обновить страницу.
      </Alert>
    );
  }

  return (
    <Box>
      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{
          mb: 3,
          borderRadius: 2,
          "& .MuiAlert-message": {
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
        }}
      >
        Выберите способ отправки товара и укажите стоимость доставки. Эта
        информация будет видна покупателям.
      </Alert>

      <ShippingMethodForm
        shippingMethods={shippingMethods || []}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Box>
  );
};
