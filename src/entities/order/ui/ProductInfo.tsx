"use client";
import React from "react";
import { Stack, Box, Typography, Skeleton, Chip } from "@mui/material";
import type { ListOrdersModel } from "../model/types";
import { useImageMetadataQuery } from "@/shared/api";
import { getImageUrl } from "@/shared/lib";

interface ProductInfoProps {
  product: ListOrdersModel["product"];
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const { data: images, isLoading } = useImageMetadataQuery(product.imageId);
  const image = images?.[0] ?? null;

  const imageSrc = getImageUrl(image, "thumbnail") ?? null;

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      {/* Изображение */}
      <Box
        sx={{
          width: { xs: 56, sm: 64 },
          height: { xs: 56, sm: 64 },
          borderRadius: 1.5,
          overflow: "hidden",
          bgcolor: "grey.100",
          flexShrink: 0,
        }}
      >
        {isLoading ? (
          <Skeleton variant="rectangular" width="100%" height="100%" />
        ) : imageSrc ? (
          <Box
            component="img"
            src={imageSrc}
            alt={product.name}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              color: "text.disabled",
            }}
          >
            Нет фото
          </Box>
        )}
      </Box>

      {/* Информация */}
      <Box flex={1} minWidth={0}>
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{
            mb: 0.25,
            fontSize: { xs: "0.85rem", sm: "0.9rem" },
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.name}
        </Typography>

        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          flexWrap="wrap"
        >
          <Chip
            label={product.categories[0]?.name || "Без категории"}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.65rem",
              fontWeight: 500,
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
          >
            × {product.count}
          </Typography>
          <Typography
            variant="caption"
            fontWeight={600}
            color="primary.main"
            sx={{ fontSize: { xs: "0.75rem", sm: "0.8rem" } }}
          >
            {product.price} {product.currency}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
};
