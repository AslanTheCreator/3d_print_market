"use client";

import { useCallback } from "react";
import { Box, Checkbox, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import { useCartItemRemoval } from "@/entities/cart";
import type { Transfer } from "@/entities/transfer";
import type { SellerCheckoutGroup } from "../model/types";
import { CheckoutSellerGroupCard } from "./CheckoutSellerGroupCard";

interface CheckoutCartSectionProps {
  sellerGroups: SellerCheckoutGroup[];
  selectedProductIds: Set<number>;
  isAllSelected: boolean;
  selectedCount: number;
  onToggleProductSelection: (productId: number, selected: boolean) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onTransferSelect: (sellerId: number, transfer: Transfer) => void;
  onRetryDelivery: (sellerId: number) => void;
}

export const CheckoutCartSection = ({
  sellerGroups,
  selectedProductIds,
  isAllSelected,
  selectedCount,
  onToggleProductSelection,
  onToggleSelectAll,
  onTransferSelect,
  onRetryDelivery,
}: CheckoutCartSectionProps) => {
  const theme = useTheme();
  const { handleRemoveItem, removingItemIds } = useCartItemRemoval();
  const totalItemsCount = sellerGroups.reduce(
    (total, group) => total + group.items.length,
    0,
  );

  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onToggleSelectAll(event.target.checked);
    },
    [onToggleSelectAll],
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pb: 2,
          mb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        <Checkbox
          checked={isAllSelected}
          indeterminate={selectedCount > 0 && !isAllSelected}
          onChange={handleSelectAll}
          inputProps={{ "aria-label": "Выбрать все товары" }}
          sx={{
            p: 0,
            color: theme.palette.grey[400],
            "&.Mui-checked, &.MuiCheckbox-indeterminate": {
              color: theme.palette.success.main,
            },
          }}
        />
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Товары и доставка
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Выбрано {selectedCount} из {totalItemsCount}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={2}>
        {sellerGroups.map((group) => (
          <CheckoutSellerGroupCard
            key={group.sellerId}
            group={group}
            selectedProductIds={selectedProductIds}
            onToggleProductSelection={onToggleProductSelection}
            onRemove={handleRemoveItem}
            removingItemIds={removingItemIds}
            onTransferSelect={onTransferSelect}
            onRetryDelivery={onRetryDelivery}
          />
        ))}
      </Stack>
    </Paper>
  );
};
