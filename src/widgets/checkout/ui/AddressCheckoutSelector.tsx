import React from "react";
import { Typography, Paper, Alert, Button } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { AddressSelector } from "@/entities/address";
import { Address } from "@/shared/types";
import { AppLink } from "@/shared/ui/app-link";

interface AddressCheckoutSelectorProps {
  addresses: Address[];
  isLoading?: boolean;
  isError?: boolean;
  selectedAddressId?: number;
  onAddressSelect: (address: Address) => void;
  onRetry?: () => void;
}

const ADDRESS_TITLE = "Адрес доставки";
const RETRY_LABEL = "Повторить";
const ADDRESS_LOAD_ERROR =
  "Не удалось загрузить адреса доставки. Попробуйте ещё раз.";
const EMPTY_ADDRESSES_TEXT =
  "У вас пока нет сохраненных адресов. Добавьте адрес в ";
const PROFILE_SETTINGS_LABEL = "настройках профиля";

export const AddressCheckoutSelector: React.FC<
  AddressCheckoutSelectorProps
> = ({
  addresses,
  isLoading = false,
  isError = false,
  selectedAddressId,
  onAddressSelect,
  onRetry,
}) => {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        {ADDRESS_TITLE}
      </Typography>

      {isError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            onRetry ? (
              <Button color="inherit" size="small" onClick={onRetry}>
                {RETRY_LABEL}
              </Button>
            ) : undefined
          }
        >
          {ADDRESS_LOAD_ERROR}
        </Alert>
      )}

      {addresses.length === 0 && !isLoading && !isError && (
        <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2 }}>
          {EMPTY_ADDRESSES_TEXT}
          <AppLink
            href="/dashboard/settings?tab=address"
            color="primary"
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            {PROFILE_SETTINGS_LABEL}
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
