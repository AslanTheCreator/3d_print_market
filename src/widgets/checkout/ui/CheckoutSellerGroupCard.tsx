"use client";

import { useCallback } from "react";
import { Box, Divider, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import { StorefrontOutlined } from "@mui/icons-material";
import { useAuth } from "@/features/auth";
import {
  CheckoutCartItemCard,
  useCartQuantity,
  type ProductBasket,
} from "@/entities/cart";
import type { Transfer } from "@/shared/types";
import { useNotification } from "@/shared/ui/notification";
import type { SellerCheckoutGroup } from "../model/types";
import { SellerDeliverySelector } from "./SellerDeliverySelector";

interface CheckoutSellerGroupCardProps {
  group: SellerCheckoutGroup;
  selectedProductIds: Set<number>;
  onToggleProductSelection: (productId: number, selected: boolean) => void;
  onRemove: (productId: number) => void;
  removingItemIds: number[];
  onTransferSelect: (sellerId: number, transfer: Transfer) => void;
  onRetryDelivery: (sellerId: number) => void;
}

const CheckoutCartItemWrapper = ({
  item,
  isSelected,
  onSelectChange,
  onRemove,
  isRemoving,
}: {
  item: ProductBasket;
  isSelected: boolean;
  onSelectChange: (id: number, selected: boolean) => void;
  onRemove: (id: number) => void;
  isRemoving: boolean;
}) => {
  const { isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const handleSyncError = useCallback(() => {
    showNotification(
      "Не удалось сохранить количество. Восстановлено предыдущее значение",
      "error",
    );
  }, [showNotification]);
  const { quantity, handleIncrement, handleDecrement, maxQuantity } =
    useCartQuantity(item.product.id, isAuthenticated, {
      maxQuantity: item.availableCount,
      onSyncError: handleSyncError,
    });

  return (
    <CheckoutCartItemCard
      item={item}
      isSelected={isSelected}
      onSelectChange={onSelectChange}
      quantity={quantity}
      onQuantityIncrement={handleIncrement}
      onQuantityDecrement={handleDecrement}
      onRemove={onRemove}
      isRemoving={isRemoving}
      maxQuantity={maxQuantity ?? undefined}
    />
  );
};

export const CheckoutSellerGroupCard = ({
  group,
  selectedProductIds,
  onToggleProductSelection,
  onRemove,
  removingItemIds,
  onTransferSelect,
  onRetryDelivery,
}: CheckoutSellerGroupCardProps) => {
  const theme = useTheme();
  const selectedItemsCount = group.items.filter((item) =>
    selectedProductIds.has(item.product.id),
  ).length;

  return (
    <Paper
      data-testid={`checkout-seller-${group.sellerId}`}
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        borderColor: alpha(theme.palette.divider, 0.9),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        sx={{ pb: 1.5 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StorefrontOutlined color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {group.sellerLogin}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Продавец
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Выбрано {selectedItemsCount} из {group.items.length}
        </Typography>
      </Stack>

      <Divider />

      <Box>
        {group.items.map((item) => (
          <CheckoutCartItemWrapper
            key={item.product.id}
            item={item}
            isSelected={selectedProductIds.has(item.product.id)}
            onSelectChange={onToggleProductSelection}
            onRemove={onRemove}
            isRemoving={removingItemIds.includes(item.product.id)}
          />
        ))}
      </Box>

      <Box sx={{ pt: 2 }}>
        <SellerDeliverySelector
          group={group}
          onSelect={onTransferSelect}
          onRetry={onRetryDelivery}
        />
      </Box>
    </Paper>
  );
};
