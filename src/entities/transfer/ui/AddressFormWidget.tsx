// widgets/transfer-settings/ui/AddressFormWidget.tsx
"use client";

import React from "react";
import { Box, Typography, Alert } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { AddressForm } from "@/entities/address/ui/AddressForm";

interface AddressFormWidgetProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export const AddressFormWidget: React.FC<AddressFormWidgetProps> = ({
  onSuccess,
  onError,
}) => {
  // Предполагаемый хук для работы с адресом
  // const { data: currentAddress, isLoading: isLoadingAddress } = useCurrentAddress();
  // const { mutateAsync: saveAddress, isPending } = useSaveAddress();

  const handleSubmit = async (data: any) => {
    try {
      // await saveAddress(data);
      console.log("Saving address:", data);
      onSuccess?.();
    } catch (error) {
      onError?.("Не удалось сохранить адрес. Попробуйте снова.");
    }
  };

  const handleCancel = () => {
    // Логика отмены или возврата
  };

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
        Укажите адрес для доставки товаров. Эти данные будут использованы при
        оформлении заказа.
      </Alert>

      <AddressForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // isLoading={isPending}
        // initialData={currentAddress}
      />
    </Box>
  );
};
