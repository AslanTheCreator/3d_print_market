"use client";

import React, { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type { ListOrdersModel } from "@/entities/order";
import { getImageUrl } from "@/shared/lib";
import { ImageFallback } from "@/shared/ui/image-fallback";
import {
  getOrderPeerLabel,
  type OrdersUserRole,
} from "../model/dashboardOrders";

interface OrderProductPreviewProps {
  order: ListOrdersModel;
  userRole: OrdersUserRole;
  imageSize?: number;
  showCategory?: boolean;
}

export const OrderProductPreview = ({
  order,
  userRole,
  imageSize = 64,
  showCategory = true,
}: OrderProductPreviewProps) => {
  const [hasImageError, setHasImageError] = useState(false);
  const image = order.product.image?.[0] ?? null;
  const productImageSrc = getImageUrl(image, "thumbnail") ?? null;
  const imageSrc =
    productImageSrc && !hasImageError ? productImageSrc : null;
  const categoryName = order.product.categories[0]?.name ?? "Без категории";

  useEffect(() => {
    setHasImageError(false);
  }, [productImageSrc]);

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
      <Box
        sx={{
          width: imageSize,
          height: imageSize,
          borderRadius: 1.5,
          overflow: "hidden",
          bgcolor: "grey.100",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {imageSrc ? (
          <Box
            component="img"
            src={imageSrc}
            alt={order.product.name}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={() => setHasImageError(true)}
          />
        ) : (
          <ImageFallback compact label="Нет фото" />
        )}
      </Box>

      <Box minWidth={0}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          Заказ #{order.orderId}
        </Typography>

        <Typography
          variant="body2"
          color="text.primary"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {order.product.name}
        </Typography>

        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          flexWrap="wrap"
          sx={{ mt: 0.5 }}
        >
          {showCategory && (
            <Chip
              label={categoryName}
              size="small"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          )}
          <Typography variant="caption" color="text.secondary">
            {getOrderPeerLabel(userRole)}: {order.userInfo.login}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
};
