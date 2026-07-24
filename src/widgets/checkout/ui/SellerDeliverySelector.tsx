"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Skeleton,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { CheckCircle, InfoOutlined } from "@mui/icons-material";
import { useDictionary } from "@/entities/dictionary";
import { getDeliveryIcon } from "@/entities/transfer";
import { formatPrice } from "@/shared/lib";
import type { Transfer } from "@/entities/transfer";
import type { SellerCheckoutGroup } from "../model/types";

interface SellerDeliverySelectorProps {
  group: SellerCheckoutGroup;
  onSelect: (sellerId: number, transfer: Transfer) => void;
  onRetry: (sellerId: number) => void;
}

export const SellerDeliverySelector = ({
  group,
  onSelect,
  onRetry,
}: SellerDeliverySelectorProps) => {
  const theme = useTheme();
  const { data: shoppingMethods } = useDictionary("SHOPPING_METHODS");

  if (!group.isActive) {
    return (
      <Alert severity="info" icon={<InfoOutlined />}>
        Выберите хотя бы один товар продавца, чтобы настроить доставку.
      </Alert>
    );
  }

  if (group.isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {[1, 2].map((item) => (
          <Skeleton
            key={item}
            variant="rectangular"
            height={56}
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Box>
    );
  }

  if (group.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => onRetry(group.sellerId)}
          >
            Повторить
          </Button>
        }
      >
        {group.errorMessage || "Не удалось загрузить способы доставки"}
      </Alert>
    );
  }

  if (group.transfers.length === 0) {
    return (
      <Alert severity="warning">
        У продавца нет доступных способов доставки. Исключите его товары из
        заказа, чтобы оформить остальные.
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 1.5,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Доставка от продавца
        </Typography>
        {group.selectedTransfer && (
          <Chip
            icon={<CheckCircle sx={{ fontSize: 16 }} />}
            label="Выбрано"
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      <RadioGroup
        value={group.selectedTransfer ? String(group.selectedTransfer.id) : ""}
        onChange={(event) => {
          const transfer = group.transfers.find(
            (item) => item.id === Number(event.target.value),
          );

          if (transfer) {
            onSelect(group.sellerId, transfer);
          }
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {group.transfers.map((transfer) => {
            const isSelected = group.selectedTransfer?.id === transfer.id;
            const method = shoppingMethods?.find(
              (item) => item.value === transfer.sending,
            );
            const priceLabel =
              transfer.price === 0
                ? "Бесплатно"
                : formatPrice(transfer.price, transfer.currency);

            return (
              <Paper
                key={transfer.id}
                data-testid={`checkout-delivery-${group.sellerId}-${transfer.id}`}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderWidth: 2,
                  borderColor: isSelected
                    ? "primary.main"
                    : alpha(theme.palette.divider, 0.8),
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.04)
                    : "transparent",
                  cursor: "pointer",
                  transition: "border-color 0.2s, background-color 0.2s",
                }}
                onClick={() => onSelect(group.sellerId, transfer)}
              >
                <FormControlLabel
                  value={String(transfer.id)}
                  control={<Radio sx={{ mr: 1 }} />}
                  label={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        width: "100%",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ color: "primary.main", display: "flex" }}>
                          {getDeliveryIcon(transfer.sending)}
                        </Box>
                        <Typography fontWeight={isSelected ? 600 : 500}>
                          {method?.description || transfer.sending}
                        </Typography>
                      </Box>
                      <Typography fontWeight={600} color="text.secondary">
                        {priceLabel}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: "100%" }}
                />
              </Paper>
            );
          })}
        </Box>
      </RadioGroup>
    </Box>
  );
};
