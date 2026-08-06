"use client";

import { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { useImagesQuery } from "@/entities/image";
import {
  ImageGallery,
  type ImageGalleryImage,
} from "@/shared/ui/image-gallery";
import type { ImageResponse } from "@/entities/image";

interface OrderPaymentProofProps {
  orderId: number;
  imageIds: readonly number[];
}

const IMAGE_CONTENT_TYPE_PATTERN = /^image\/[a-z0-9.+-]+$/i;
const BASE64_PATTERN =
  /^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}(?:==)?|[a-z0-9+/]{3}=?)?$/i;

const isImageResponse = (value: unknown): value is ImageResponse => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const image = value as Partial<ImageResponse>;

  return (
    typeof image.contentType === "string" &&
    typeof image.imageData === "string"
  );
};

const toImageDataUrl = (image: unknown): string | null => {
  if (!isImageResponse(image)) {
    return null;
  }

  const contentType = image.contentType.trim().toLowerCase();
  const imageData = image.imageData.replace(/\s/g, "");

  if (
    !IMAGE_CONTENT_TYPE_PATTERN.test(contentType) ||
    !imageData ||
    !BASE64_PATTERN.test(imageData)
  ) {
    return null;
  }

  return `data:${contentType};base64,${imageData}`;
};

export const OrderPaymentProof = ({
  orderId,
  imageIds,
}: OrderPaymentProofProps) => {
  const validImageIds = useMemo(
    () => [
      ...new Set(
        imageIds.filter((imageId) => Number.isInteger(imageId) && imageId > 0),
      ),
    ],
    [imageIds],
  );
  const {
    data: imageResponses,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useImagesQuery(validImageIds);
  const galleryImages = useMemo<ImageGalleryImage[]>(
    () =>
      (imageResponses ?? []).flatMap((image) => {
        const source = toImageDataUrl(image);

        return source
          ? [
              {
                previewSrc: source,
                thumbnailSrc: source,
                originalSrc: source,
              },
            ]
          : [];
      }),
    [imageResponses],
  );

  const content = (() => {
    if (validImageIds.length === 0) {
      return (
        <Alert severity="info">
          Подтверждение оплаты для этого заказа не приложено.
        </Alert>
      );
    }

    if (isLoading) {
      return (
        <Stack
          spacing={1.5}
          aria-label="Загрузка подтверждения оплаты"
          aria-busy="true"
        >
          <Skeleton
            variant="rounded"
            sx={{
              width: "100%",
              aspectRatio: { xs: "4/3", sm: "16/10", md: "3/2" },
              borderRadius: { xs: 2, sm: 2.5, md: 3 },
            }}
          />
          {validImageIds.length > 1 && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                p: { xs: 2, sm: 2.5, md: 3 },
              }}
            >
              <Stack
                direction="row"
                spacing={{ xs: 1, sm: 1.5, md: 2 }}
                sx={{
                  overflowX: "auto",
                  pb: { xs: 1, sm: 1.5 },
                }}
              >
                {validImageIds.map((imageId) => (
                  <Skeleton
                    key={imageId}
                    variant="rounded"
                    sx={{
                      flexShrink: 0,
                      width: { xs: 60, sm: 80, md: 100 },
                      height: { xs: 60, sm: 80, md: 100 },
                      borderRadius: { xs: 1, sm: 1.25, md: 1.5 },
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Загружаем подтверждение оплаты...
            </Typography>
          </Stack>
        </Stack>
      );
    }

    if (isError) {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={
                isFetching ? <CircularProgress size={16} /> : <Refresh />
              }
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              Повторить
            </Button>
          }
        >
          Не удалось загрузить подтверждение оплаты.
        </Alert>
      );
    }

    if (galleryImages.length === 0) {
      return (
        <Alert severity="info">
          В ответе сервера нет доступных изображений подтверждения оплаты.
        </Alert>
      );
    }

    return (
      <ImageGallery
        images={galleryImages}
        alt={`Подтверждение оплаты по заказу #${orderId}`}
      />
    );
  })();

  return (
    <Paper
      component="section"
      data-testid="order-payment-proof"
      variant="outlined"
      sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography component="h3" variant="h6" fontWeight={700}>
          Подтверждение оплаты
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Заказ #{orderId}
        </Typography>
      </Box>

      {content}
    </Paper>
  );
};
