"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Box,
  Checkbox,
  Typography,
  useTheme,
  alpha,
  Paper,
} from "@mui/material";
import { CartProductModel, useCartQuantity } from "@/entities/cart";
import { CheckoutCartItemCard } from "@/entities/cart/ui/CheckoutCartItemCard";
import { useRemoveFromCartFeature } from "@/features/cart";

interface CheckoutCartSectionProps {
  items: CartProductModel[];
}

// Компонент-обёртка для отдельного товара с хуком useCartQuantity
const CheckoutCartItemWrapper = ({
  item,
  isSelected,
  onSelectChange,
  onRemove,
  isRemoving,
}: {
  item: CartProductModel;
  isSelected: boolean;
  onSelectChange: (id: number, selected: boolean) => void;
  onRemove: (id: number) => void;
  isRemoving: boolean;
}) => {
  const { quantity, handleIncrement, handleDecrement, maxQuantity } =
    useCartQuantity(item.id, { maxQuantity: item.count });

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

export const CheckoutCartSection = ({ items }: CheckoutCartSectionProps) => {
  const theme = useTheme();
  const { handleRemoveItem, removingItemIds } = useRemoveFromCartFeature();

  // Локальный стейт для выбранных товаров
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    return new Set(items.map((item) => item.id));
  });

  const isAllSelected = useMemo(() => {
    return items.length > 0 && items.every((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const selectedCount = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id)).length;
  }, [items, selectedIds]);

  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setSelectedIds(new Set(items.map((item) => item.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [items],
  );

  const handleSelectItem = useCallback((id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Плюрализация слова "товар"
  const getItemsWord = (count: number): string => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return "товаров";
    }

    if (lastDigit === 1) {
      return "товар";
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return "товара";
    }

    return "товаров";
  };

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
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
            }}
          >
            Корзина
          </Typography>
          <Typography
            sx={{
              color: theme.palette.text.secondary,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {items.length} {getItemsWord(items.length)}
          </Typography>
        </Box>

        {/* Select All */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
          }}
          onClick={() =>
            handleSelectAll({
              target: { checked: !isAllSelected },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        >
          <Checkbox
            checked={isAllSelected}
            onChange={handleSelectAll}
            sx={{
              p: 0,
              color: theme.palette.grey[400],
              "&.Mui-checked": {
                color: theme.palette.success.main,
              },
            }}
          />
          <Typography
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" },
              color: theme.palette.text.secondary,
              userSelect: "none",
            }}
          >
            Выбрать все
          </Typography>
          {selectedCount > 0 && selectedCount < items.length && (
            <Typography
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                color: theme.palette.text.disabled,
              }}
            >
              (выбрано {selectedCount})
            </Typography>
          )}
        </Box>
      </Box>

      {/* Items List */}
      <Box>
        {items.map((item) => (
          <CheckoutCartItemWrapper
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            onSelectChange={handleSelectItem}
            onRemove={handleRemoveItem}
            isRemoving={removingItemIds.includes(item.id)}
          />
        ))}
      </Box>
    </Paper>
  );
};
