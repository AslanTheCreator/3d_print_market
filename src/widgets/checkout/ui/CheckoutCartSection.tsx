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
import { ProductBasket, useCartQuantity } from "@/entities/cart";
import { CheckoutCartItemCard } from "@/entities/cart/ui/CheckoutCartItemCard";
import { useRemoveFromCartFeature } from "@/features/cart";

interface CheckoutCartSectionProps {
  items: ProductBasket[];
}

// Компонент-обёртка для отдельного товара с хуком useCartQuantity
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
  // item.product.count — количество в наличии (максимум)
  // item.count — количество в корзине (серверное)
  const { quantity, handleIncrement, handleDecrement, maxQuantity } =
    useCartQuantity(item.product.id, { maxQuantity: item.product.count });

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
    return new Set(items.map((item) => item.product.id));
  });

  const isAllSelected = useMemo(() => {
    return (
      items.length > 0 &&
      items.every((item) => selectedIds.has(item.product.id))
    );
  }, [items, selectedIds]);

  const selectedCount = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.product.id)).length;
  }, [items, selectedIds]);

  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setSelectedIds(new Set(items.map((item) => item.product.id)));
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
      {/* Заголовок с чекбоксом "Выбрать все" */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        <Checkbox
          checked={isAllSelected}
          indeterminate={selectedCount > 0 && !isAllSelected}
          onChange={handleSelectAll}
          sx={{
            p: 0,
            color: theme.palette.grey[400],
            "&.Mui-checked, &.MuiCheckbox-indeterminate": {
              color: theme.palette.success.main,
            },
          }}
        />
        <Typography variant="h6" fontWeight={600}>
          Корзина
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.secondary }}
        >
          {selectedCount} {getItemsWord(selectedCount)} выбрано
        </Typography>
      </Box>

      {/* Список товаров */}
      <Box>
        {items.map((item) => (
          <CheckoutCartItemWrapper
            key={item.product.id}
            item={item}
            isSelected={selectedIds.has(item.product.id)}
            onSelectChange={handleSelectItem}
            onRemove={handleRemoveItem}
            isRemoving={removingItemIds.includes(item.product.id)}
          />
        ))}
      </Box>
    </Paper>
  );
};
