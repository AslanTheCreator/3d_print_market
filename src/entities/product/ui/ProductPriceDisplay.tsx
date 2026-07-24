"use client";

import React from "react";
import { Typography, Stack, useMediaQuery, useTheme } from "@mui/material";
import { Star } from "@mui/icons-material";
import { formatPrice } from "@/shared/lib";
import type { Availability } from "../model/types";

interface ProductPriceDisplayProps {
  price: number;
  prepaymentAmount: number;
  availability: Availability;
  rating?: number;
  reviewCount?: number;
}

export const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({
  price,
  prepaymentAmount,
  availability,
  rating,
  reviewCount,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isPreorder = availability === "PREORDER";

  const hasRating =
    rating !== undefined && rating > 0 && (reviewCount ?? 0) > 0;

  // Форматирование количества оценок
  const formatReviewCount = (count: number): string => {
    if (count === 1) return "1 оценка";
    if (count > 1 && count < 5) return `${count} оценки`;
    return `${count} оценок`;
  };

  return (
    <Stack
      spacing={0.5}
      sx={{
        justifyContent: "flex-start",
      }}
    >
      {/* Цена */}
      {isPreorder ? (
        <Stack spacing={0.25}>
          {/* Основная цена */}
          <Typography
            fontWeight={800}
            fontSize={isMobile ? "1.125rem" : "1.25rem"}
            color="text.primary"
            sx={{ lineHeight: 1.2 }}
          >
            {formatPrice(price)} ₽
          </Typography>
          {/* Цена предзаказа */}
          <Typography
            variant="caption"
            color="text.primary"
            sx={{
              fontSize: isMobile ? "0.75rem" : "0.8rem",
              fontWeight: 600,
            }}
          >
            Предзаказ: {formatPrice(prepaymentAmount)} ₽
          </Typography>
        </Stack>
      ) : (
        <>
          <Typography
            fontWeight={800}
            fontSize={isMobile ? "1rem" : "1.125rem"}
            color="text.primary"
            sx={{ lineHeight: 1.2 }}
          >
            {formatPrice(price)} ₽
          </Typography>

          {/* Пустая строка-заглушка */}
          <Typography
            variant="caption"
            sx={{
              visibility: "hidden",
              fontSize: isMobile ? "0.75rem" : "0.8rem",
            }}
          >
            placeholder
          </Typography>
        </>
      )}

      {/* Рейтинг и отзывы — скрываем визуально, но сохраняем высоту */}
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{ visibility: hasRating ? "visible" : "hidden" }}
      >
        <Star
          sx={{
            fontSize: isMobile ? "1rem" : "1.125rem",
            color: "warning.main",
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontSize: isMobile ? "0.75rem" : "0.8rem",
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          {hasRating ? rating!.toFixed(1) : "0.0"}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: isMobile ? "0.7rem" : "0.75rem",
            color: "text.secondary",
          }}
        >
          •
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontSize: isMobile ? "0.7rem" : "0.75rem",
            fontWeight: 500,
          }}
        >
          {hasRating ? formatReviewCount(reviewCount!) : "0 оценок"}
        </Typography>
      </Stack>
    </Stack>
  );
};
