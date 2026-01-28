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
import { useState } from "react";
import { ProductBasket } from "../model/types";
import { formatPrice } from "@/shared/lib";
import { QuantityCounter } from "@/shared/ui/quantity-counter";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { id, name, price, categories, image } = item;

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
      <Link href={`/catalog/${id}/detail`} passHref legacyBehavior>
        <Box
          component="a"
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
          {image?.[0]?.imageData ? (
            <>
              {!isImageLoaded && (
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height="100%"
                  animation="wave"
                  sx={{ position: "absolute" }}
                />
              )}
              <Image
                src={`data:${image[0].contentType};base64,${image[0].imageData}`}
                alt={name}
                fill
                sizes="(max-width: 600px) 80px, 100px"
                style={{
                  objectFit: "cover",
                  opacity: isImageLoaded ? 1 : 0,
                  transition: "opacity 0.3s",
                }}
                onLoad={() => setIsImageLoaded(true)}
              />
            </>
          ) : (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                fontSize: "0.7rem",
              }}
            >
              Нет фото
            </Box>
          )}
        </Box>
      </Link>

      {/* Product Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/catalog/${id}/detail`}
          passHref
          style={{ textDecoration: "none" }}
        >
          <Typography
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" },
              fontWeight: 500,
              color: theme.palette.text.primary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.3,
              mb: 0.5,
              cursor: "pointer",
              "&:hover": {
                color: theme.palette.primary.main,
              },
            }}
          >
            {name}
          </Typography>
        </Link>

        {categoryName && (
          <Typography
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.8125rem" },
              color: theme.palette.text.secondary,
              mb: { xs: 1.5, sm: 2 },
            }}
          >
            {categoryName}
          </Typography>
        )}

        {/* Delete Button */}
        <IconButton
          onClick={handleRemove}
          disabled={isRemoving}
          size="small"
          sx={{
            p: 0.5,
            color: theme.palette.text.secondary,
            "&:hover": {
              color: theme.palette.error.main,
              backgroundColor: alpha(theme.palette.error.main, 0.08),
            },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
        </IconButton>
      </Box>

      {/* Quantity & Price Section */}
      <Stack
        direction={isMobile ? "column" : "row"}
        alignItems={isMobile ? "flex-end" : "center"}
        spacing={isMobile ? 1.5 : 3}
        sx={{ flexShrink: 0 }}
      >
        {/* Quantity Counter */}
        <QuantityCounter
          value={quantity}
          onIncrement={onQuantityIncrement}
          onDecrement={onQuantityDecrement}
          disabled={isRemoving}
          max={maxQuantity}
          size={isMobile ? "small" : "medium"}
        />

        {/* Price */}
        <Typography
          sx={{
            fontSize: { xs: "1rem", sm: "1.125rem" },
            fontWeight: 700,
            color: theme.palette.primary.main,
            minWidth: { xs: "auto", sm: 100 },
            textAlign: "right",
          }}
        >
          {formatPrice(price * quantity)} ₽
        </Typography>
      </Stack>
    </Box>
  );
};
