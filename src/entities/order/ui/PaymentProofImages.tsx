"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Skeleton,
  IconButton,
  Dialog,
  DialogContent,
  Paper,
  alpha,
} from "@mui/material";
import { Close, Receipt, ZoomIn } from "@mui/icons-material";
import { useImagesQuery } from "@/shared/api";
import { ImageResponse } from "@/shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentProofImagesProps {
  /** Массив ID изображений из order.images */
  imageIds: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Thumbnail — миниатюра с кликом для увеличения
// ─────────────────────────────────────────────────────────────────────────────

interface ThumbnailProps {
  image: ImageResponse;
  index: number;
  onZoom: (src: string) => void;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ image, index, onZoom }) => {
  const src = `data:${image.contentType};base64,${image.imageData}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        position: "relative",
        width: { xs: 72, sm: 88 },
        height: { xs: 72, sm: 88 },
        borderRadius: 1.5,
        overflow: "hidden",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}`,
          "& .zoom-overlay": {
            opacity: 1,
          },
        },
      }}
      onClick={() => onZoom(src)}
    >
      <img
        src={src}
        alt={`Подтверждение оплаты ${index + 1}`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {/* Overlay при наведении */}
      <Box
        className="zoom-overlay"
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: (theme) => alpha(theme.palette.common.black, 0.4),
          opacity: 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <ZoomIn sx={{ color: "white", fontSize: 24 }} />
      </Box>
    </Paper>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PaymentProofImages — основной компонент
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentProofImages: React.FC<PaymentProofImagesProps> = ({
  imageIds,
}) => {
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);
  const { data: images = [], isLoading } = useImagesQuery(imageIds);

  // Не рендерим ничего, если нет изображений
  if (!imageIds.length) return null;

  return (
    <>
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{ mb: 1 }}
        >
          <Receipt sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography variant="subtitle2" color="text.primary">
            Подтверждение оплаты
          </Typography>
        </Stack>

        {isLoading ? (
          <Stack direction="row" spacing={1}>
            {imageIds.map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                width={88}
                height={88}
                sx={{ borderRadius: 1.5, flexShrink: 0 }}
              />
            ))}
          </Stack>
        ) : images.length > 0 ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              overflowX: "auto",
              pb: 0.5,
              // Тонкий скроллбар
              "&::-webkit-scrollbar": { height: 4 },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "rgba(0,0,0,0.15)",
                borderRadius: 2,
              },
            }}
          >
            {images.map((img, i) => (
              <Thumbnail
                key={img.filename || i}
                image={img}
                index={i}
                onZoom={setZoomedSrc}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Не удалось загрузить изображения
          </Typography>
        )}
      </Box>

      {/* Полноэкранный просмотр */}
      <Dialog
        open={!!zoomedSrc}
        onClose={() => setZoomedSrc(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <IconButton
            onClick={() => setZoomedSrc(null)}
            sx={{
              position: "absolute",
              top: -40,
              right: 0,
              color: "white",
              bgcolor: "rgba(0,0,0,0.5)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <Close />
          </IconButton>

          {zoomedSrc && (
            <img
              src={zoomedSrc}
              alt="Подтверждение оплаты"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 8,
                objectFit: "contain",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
