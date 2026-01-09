"use client";
import React, { useState, useEffect } from "react";
import { Stack, Box, Typography, Skeleton } from "@mui/material";
import { ShoppingCart } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order";
import { imageApi } from "@/entities/image";
import { ImageResponse } from "@/entities/image";

interface ProductInfoProps {
  product: ListOrdersModel["product"];
}

export const ProductInfo = ({ product }: ProductInfoProps) => {
  const [image, setImage] = useState<ImageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!product.imageId || product.imageId === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);
        const images = await imageApi.getImages(product.imageId);

        if (images && images.length > 0) {
          setImage(images[0]);
        }
      } catch (error) {
        console.error("Ошибка при загрузке изображения товара:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [product.imageId]);

  const imageSrc = image
    ? `data:${image.contentType};base64,${image.imageData}`
    : null;

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
      <Box
        sx={{
          width: { xs: 60, sm: 80 },
          height: { xs: 60, sm: 80 },
          bgcolor: "grey.100",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {isLoading ? (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            animation="wave"
          />
        ) : imageSrc && !hasError ? (
          <Box
            component="img"
            src={imageSrc}
            alt={product.name}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={() => setHasError(true)}
          />
        ) : (
          <ShoppingCart color="action" />
        )}
      </Box>
      <Box flex={1}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Категория: {product.categories[0].name}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 0.5, sm: 2 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="body2">
            Количество: <strong>{product.count}</strong>
          </Typography>
          <Typography variant="body2" color="primary.main" fontWeight={600}>
            {product.price} {product.currency}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
};
