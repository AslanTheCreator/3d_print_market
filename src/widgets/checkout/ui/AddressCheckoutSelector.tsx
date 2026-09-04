import React from "react";
import {
  Typography,
  Paper,
  Alert,
  Button,
  Box,
  Stack,
  CircularProgress,
} from "@mui/material";
import { AddressForm, AddressSelector, type Address } from "@/entities/address";
import type { CheckoutAddressCreation } from "../model/useCheckoutAddressCreation";

interface AddressCheckoutSelectorProps {
  addresses: Address[];
  isLoading?: boolean;
  isError?: boolean;
  selectedAddressId?: number;
  onAddressSelect: (address: Address) => void;
  onRetry?: () => void;
  addressCreation: CheckoutAddressCreation;
  isSubmitting?: boolean;
}

const ADDRESS_TITLE = "Адрес доставки";
const RETRY_LABEL = "Повторить";
const ADDRESS_LOAD_ERROR =
  "Не удалось загрузить адреса доставки. Попробуйте ещё раз.";

export const AddressCheckoutSelector: React.FC<
  AddressCheckoutSelectorProps
> = ({
  addresses,
  isLoading = false,
  isError = false,
  selectedAddressId,
  onAddressSelect,
  onRetry,
  addressCreation,
  isSubmitting = false,
}) => {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        {ADDRESS_TITLE}
      </Typography>

      {!addressCreation.isOpen && addressCreation.notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {addressCreation.notice}
        </Alert>
      )}

      {!addressCreation.isOpen && isError && (
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

      {!addressCreation.isOpen && !isError && (
        <AddressSelector
          addresses={addresses}
          isLoading={isLoading}
          selectedAddressId={selectedAddressId}
          onAddressSelect={onAddressSelect}
          onAddNewAddress={addressCreation.open}
          showRadio={true}
          showDeleteButton={false}
          showAddButton={!isSubmitting}
        />
      )}

      {addressCreation.isOpen && (
        <Box>
          {addressCreation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addressCreation.error}
            </Alert>
          )}

          {addressCreation.isResolving || addressCreation.needsReload ? (
            <Stack spacing={2}>
              {addressCreation.isResolving && (
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  role="status"
                >
                  <CircularProgress size={20} aria-label="Обновляем адреса" />
                  <Typography>
                    Адрес сохранён. Обновляем список адресов…
                  </Typography>
                </Stack>
              )}
              {addressCreation.needsReload && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant="contained"
                    onClick={() => void addressCreation.retry()}
                  >
                    Повторить загрузку
                  </Button>
                  <Button variant="outlined" onClick={addressCreation.cancel}>
                    Вернуться к адресам
                  </Button>
                </Stack>
              )}
            </Stack>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Адрес сохранится в вашем аккаунте и будет использован для этого
                заказа.
              </Typography>
              <AddressForm
                title="Новый адрес доставки"
                submitButtonText="Сохранить и использовать"
                onSubmit={addressCreation.submit}
                onCancel={addressCreation.cancel}
                isLoading={addressCreation.isSaving}
              />
            </>
          )}
        </Box>
      )}
    </Paper>
  );
};
