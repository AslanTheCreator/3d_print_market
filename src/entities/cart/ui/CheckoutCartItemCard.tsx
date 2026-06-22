"use client";

import {
  Box,
  Checkbox,
  IconButton,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
  alpha,
  Skeleton,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useEffect, useState } from "react";
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
  onRemove: (id: number) => void;
  isRemoving?: boolean;
  maxQuantity?: number;
}

export const CheckoutCartItemCard = ({
  item,
  isSelected,
  onSelectChange,
  quantity,
  onQuantityIncrement,
  onQuantityDecrement,
  onRemove,
  isRemoving = false,
  maxQuantity,
}: CheckoutCartItemCardProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Деструктурируем product из ProductBasket
  const { product } = item;
  const { id, name, price, categories, image, currency } = product;
  const productImage = image?.[0] ?? null;
  const productImageSrc = getImageUrl(productImage, "thumbnail");
  const imageSrc = productImageSrc && !hasImageError ? productImageSrc : null;

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
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: { xs: 1.5, sm: 2 },
        py: { xs: 2, sm: 2.5 },
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        opacity: isRemoving ? 0.5 : 1,
        pointerEvents: isRemoving ? "none" : "auto",
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onChange={handleCheckboxChange}
        inputProps={{ "aria-label": `Выбрать товар ${name}` }}
        sx={{
          p: 0,
          mt: 0.5,
          color: theme.palette.grey[400],
          "&.Mui-checked": {
            color: theme.palette.success.main,
          },
        }}
      />

      {/* Product Image */}
      <Link href={`/catalog/${id}/detail`} style={{ textDecoration: "none" }}>
        <Box
          sx={{
            position: "relative",
            width: { xs: 80, sm: 100 },
            height: { xs: 80, sm: 100 },
            borderRadius: 2,
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: alpha(theme.palette.grey[200], 0.5),
            cursor: "pointer",
            transition: "opacity 0.2s ease",
            "&:hover": {
              opacity: 0.85,
            },
          }}
        >
          {imageSrc ? (
            <>
              {!isImageLoaded && (
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height="100%"
                  animation="wave"
                  sx={{ position: "absolute", top: 0, left: 0 }}
                />
              )}
              <Image
                src={imageSrc}
                alt={name}
                fill
                style={{
                  objectFit: "cover",
                  opacity: isImageLoaded ? 1 : 0,
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
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
            {categoryName && (
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  display: "block",
                  mb: 0.5,
                }}
              >
                {categoryName}
              </Typography>
            )}
            <Link
              href={`/catalog/${id}/detail`}
              style={{ textDecoration: "none" }}
            >
              <Typography
                variant={isMobile ? "body2" : "body1"}
                fontWeight={600}
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                  "&:hover": {
                    color: theme.palette.primary.main,
                  },
                }}
              >
                {name}
              </Typography>
            </Link>
          </Box>

          {/* Delete button */}
          <IconButton
            onClick={handleRemove}
            disabled={isRemoving}
            size="small"
            sx={{
              color: theme.palette.grey[500],
              "&:hover": {
                color: theme.palette.error.main,
                backgroundColor: alpha(theme.palette.error.main, 0.08),
              },
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Price and Quantity */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: { xs: 1.5, sm: 2 } }}
        >
          <Typography
            variant={isMobile ? "body1" : "h6"}
            fontWeight={700}
            color="primary"
          >
            {formatPrice(price * quantity, currency)}
          </Typography>

          <QuantityCounter
            value={quantity}
            onIncrement={onQuantityIncrement}
            onDecrement={onQuantityDecrement}
            min={1}
            max={maxQuantity}
            size={isMobile ? "small" : "medium"}
          />
        </Stack>
      </Box>
    </Box>
  );
};
