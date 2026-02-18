import React from "react";
import { Typography, Paper, Alert } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { AddressSelector } from "@/entities/address";
import { Address } from "@/shared/types";
import { AppLink } from "@/shared/ui/app-link";

interface AddressCheckoutSelectorProps {
  addresses: Address[];
  isLoading?: boolean;
  selectedAddressId?: number;
  onAddressSelect: (address: Address) => void;
}

export const AddressCheckoutSelector: React.FC<
  AddressCheckoutSelectorProps
> = ({ addresses, isLoading = false, selectedAddressId, onAddressSelect }) => {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Адрес доставки
      </Typography>

      {addresses.length === 0 && !isLoading && (
        <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2 }}>
          У вас пока нет сохраненных адресов. Добавьте адрес в{" "}
          <AppLink
            href="/dashboard/settings?tab=address"
            color="primary"
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            настройках профиля
          </AppLink>
          .
        </Alert>
      )}

      <AddressSelector
        addresses={addresses}
        isLoading={isLoading}
        selectedAddressId={selectedAddressId}
        onAddressSelect={onAddressSelect}
        showRadio={true}
        showDeleteButton={false}
      />
    </Paper>
  );
};
