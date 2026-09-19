"use client";

import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, IconButton,
  Stack, Typography, useTheme, alpha, Skeleton,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { type ReactNode, useEffect, useState } from "react";
import { ProductBasket } from "../model/types";
import { formatPrice, getImageUrl } from "@/shared/lib";
import { QuantityCounter } from "@/shared/ui/quantity-counter";
import { ImageFallback } from "@/shared/ui/image-fallback";

interface CheckoutCartItemCardProps {
  item: ProductBasket;
  isSelected: boolean;
  onSelectChange: (id: number, selected: boolean) => void;
  quantity: number;
  onQuantityIncrement: () => void;
  onQuantityDecrement: () => void;
  onQuantitySet?: (quantity: number) => void;
  onRemove: (id: number) => void;
  isRemoving?: boolean;
  maxQuantity?: number;
  actionSlot?: ReactNode;
}

export const CheckoutCartItemCard = ({
  item, isSelected, onSelectChange, quantity, onQuantityIncrement,
  onQuantityDecrement, onQuantitySet, onRemove, isRemoving = false,
  maxQuantity, actionSlot,
}: CheckoutCartItemCardProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const theme = useTheme();

  // Деструктурируем product из ProductBasket
  const { product } = item;
  const { id, name, price, categories, image, currency } = product;
  const isExternalOnly = product.availability === "EXTERNAL_ONLY";
  const isPreorder = product.availability === "PREORDER";
  const isStockInsufficient = !isExternalOnly && item.enoughStock === false;
  const displayQuantity = isExternalOnly ? 1 : quantity;
  const fullPrice = price * displayQuantity;
  const preorderPrepayment = product.prepaymentAmount * displayQuantity;
  const preorderRemainder = (price - product.prepaymentAmount) * displayQuantity;
  const productImage = image?.[0] ?? null;
  const productImageSrc = getImageUrl(productImage, "thumbnail");
  const imageSrc = productImageSrc && !hasImageError ? productImageSrc : null;
  const availableCount = item.availableCount;

  useEffect(() => {
    setIsImageLoaded(false);
    setHasImageError(false);
  }, [productImageSrc]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelectChange(id, event.target.checked);
  };

  const handleRemove = () => onRemove(id);
  const categoryName = categories?.[0]?.name;

  return (
    <Box
      data-testid={`checkout-cart-item-${id}`}
      data-stock-status={isStockInsufficient ? "insufficient" : "enough"}
      aria-busy={isRemoving}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "80px minmax(0, 1fr)", sm: "100px minmax(0, 1fr)" },
        gap: 1.5,
        pt: 1,
        pb: 2.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        opacity: isRemoving ? 0.5 : 1,
        pointerEvents: isRemoving ? "none" : "auto",
        transition: "opacity 0.2s ease-in-out",
        "& a:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 3,
          borderRadius: 1,
        },
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ gridColumn: "1 / -1" }}>
        {/* Checkbox */}
        <FormControlLabel
          sx={{ m: 0, minWidth: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem" } }}
          label={isSelected ? "В заказе" : "Выбрать"}
          control={
            <Checkbox
              checked={isSelected}
              onChange={handleCheckboxChange}
              disabled={isRemoving}
              inputProps={{ "aria-label": `Выбрать товар ${name}` }}
              sx={{
                color: "text.secondary",
                "&.Mui-checked": { color: "success.main" },
                "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main" },
              }}
            />
          }
        />
        {isPreorder && (
          <Chip
            data-testid={`checkout-preorder-badge-${id}`}
            label="Предзаказ"
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600, fontSize: "0.6875rem" }}
          />
        )}
        {/* Delete button */}
        <IconButton
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label={`Удалить товар ${name} из корзины`}
          size="small"
          sx={{
            ml: "auto", flexShrink: 0, color: "text.secondary",
            "&:hover": {
              color: "error.main",
              backgroundColor: alpha(theme.palette.error.main, 0.08),
            },
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Product Image */}
      <Link href={`/catalog/${id}/detail`} style={{ textDecoration: "none", alignSelf: "start" }}>
        <Box
          sx={{
            position: "relative",
            width: { xs: 80, sm: 100 },
            height: { xs: 80, sm: 100 },
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: alpha(theme.palette.grey[200], 0.5),
            "&:hover": { opacity: 0.85 },
          }}
        >
          {imageSrc ? (
            <>
              {!isImageLoaded && (
                <Skeleton
                  variant="rectangular" width="100%" height="100%" animation="wave"
                  sx={{ position: "absolute", top: 0, left: 0 }}
                />
              )}
              <Image
                src={imageSrc}
                alt={name}
                fill
                sizes="(max-width: 599px) 80px, 100px"
                style={{
                  objectFit: "cover", opacity: isImageLoaded ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
                onLoad={() => setIsImageLoaded(true)}
                onError={() => setHasImageError(true)}
              />
            </>
          ) : (
            <ImageFallback compact label="Нет фото" />
          )}
        </Box>
      </Link>

      {/* Product Info */}
      <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
        {categoryName && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            {categoryName}
          </Typography>
        )}
        <Link href={`/catalog/${id}/detail`} style={{ textDecoration: "none", color: "inherit" }}>
          <Typography
            variant="body1" fontWeight={600}
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" }, lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical", overflow: "hidden",
              "&:hover": { color: "primary.main" },
            }}
          >
            {name}
          </Typography>
        </Link>
        {isExternalOnly ? (
          <Typography
            data-testid={`checkout-external-notice-${id}`}
            variant="body2" fontWeight={600} color="primary.main" sx={{ mt: 0.75 }}
          >
            Доступно только через Telegram
          </Typography>
        ) : (
          <Typography
            data-testid={`checkout-stock-availability-${id}`}
            variant="caption"
            color={isStockInsufficient ? "error.main" : "text.secondary"}
            sx={{ display: "block", mt: 0.75 }}
          >
            {availableCount === null ? "Количество не ограничено" : `Доступно: ${availableCount} шт.`}
          </Typography>
        )}
      </Box>

      {/* Price and Quantity */}
      <Stack
        direction="row" justifyContent="space-between" alignItems="center"
        flexWrap="wrap" gap={1} sx={{ gridColumn: "1 / -1" }}
      >
        <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }} data-testid={isPreorder ? `checkout-preorder-total-${id}` : undefined}>
          <Typography variant="h6" component="p" fontWeight={700} sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }}>
            {formatPrice(fullPrice, currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isPreorder ? "Полная стоимость" : `${formatPrice(price, currency)} / шт.`}
          </Typography>
        </Box>
        {isExternalOnly ? actionSlot : (
          <QuantityCounter
            value={quantity}
            onIncrement={onQuantityIncrement}
            onDecrement={onQuantityDecrement}
            disabled={isRemoving}
            min={1}
            max={maxQuantity ?? (isStockInsufficient ? quantity : undefined)}
            size="small"
            itemName={name}
          />
        )}
      </Stack>

      {isPreorder && (
        <Stack
          data-testid={`checkout-preorder-finance-${id}`}
          spacing={0.75}
          sx={{ gridColumn: "1 / -1", p: 1.5, bgcolor: "action.hover", borderRadius: 1.5 }}
        >
          <PriceRow testId={`checkout-preorder-prepayment-${id}`} label="Предоплата" value={formatPrice(preorderPrepayment, currency)} />
          <PriceRow testId={`checkout-preorder-remainder-${id}`} label="Остаток после предоплаты" value={formatPrice(preorderRemainder, currency)} />
        </Stack>
      )}

      {isStockInsufficient && (
        <Alert severity="warning" sx={{ gridColumn: "1 / -1", "& .MuiAlert-message": { minWidth: 0, width: "100%" } }}>
          <Typography data-testid={`checkout-stock-error-${id}`} variant="body2" sx={{ overflowWrap: "anywhere" }}>
            {availableCount === null
              ? "Недостаточно товара для выбранного количества"
              : `Недостаточно товара: в корзине ${quantity} шт., доступно ${availableCount} шт.`}
          </Typography>
          {availableCount !== null && availableCount > 0 && availableCount < quantity && onQuantitySet ? (
            <Button color="inherit" size="small" disabled={isRemoving} onClick={() => onQuantitySet(availableCount)} sx={{ mt: 0.5 }}>
              Оставить {availableCount} шт.
            </Button>
          ) : availableCount === 0 && isSelected ? (
            <Button color="inherit" size="small" disabled={isRemoving} onClick={() => onSelectChange(id, false)} sx={{ mt: 0.5 }}>
              Исключить из заказа
            </Button>
          ) : null}
        </Alert>
      )}
    </Box>
  );
};

interface PriceRowProps {
  testId: string;
  label: string;
  value: string;
}

const PriceRow = ({ testId, label, value }: PriceRowProps) => (
  <Stack data-testid={testId} direction="row" justifyContent="space-between" alignItems="baseline" flexWrap="wrap" gap={0.5}>
    <Typography variant="caption" color="text.secondary" sx={{ flex: "1 1 110px" }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600} sx={{ ml: "auto", overflowWrap: "anywhere" }}>
      {value}
    </Typography>
  </Stack>
);
