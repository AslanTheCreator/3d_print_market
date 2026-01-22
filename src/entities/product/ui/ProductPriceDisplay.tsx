"use client";

import React from "react";
import { Box, Typography, Stack, useMediaQuery, useTheme } from "@mui/material";
import { Star } from "@mui/icons-material";
import { formatPrice } from "@/shared/lib/utils/formatPrice";
import { Availability } from "../model/types";

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
  rating = 4.5,
  reviewCount = 12,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isPreorder = availability === "PREORDER";

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
        minHeight: isMobile ? 44 : 48,
        justifyContent: "flex-start",
      }}
    >
      {/* Цена */}
      {isPreorder ? (
        <Stack spacing={0.25}>
          {/* Основная цена */}
          <Typography
            fontWeight={800}
            fontSize={isMobile ? "1rem" : "1.125rem"}
            color="primary.main"
            sx={{ lineHeight: 1.2 }}
          >
            {formatPrice(price)} ₽
          </Typography>
          {/* Цена предзаказа */}
          <Typography
            variant="caption"
            color="preorder.main"
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
            color="primary.main"
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

      {/* Рейтинг и отзывы */}
      <Stack direction="row" spacing={0.5} alignItems="center">
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
          {rating.toFixed(1)}
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
          {formatReviewCount(reviewCount)}
        </Typography>
      </Stack>
    </Stack>
  );
};
