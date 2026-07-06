"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  alpha,
  useTheme,
  Stack,
  Chip,
  useMediaQuery,
} from "@mui/material";
import { Add, CheckCircle, Delete, ImageOutlined } from "@mui/icons-material";
import { UseMultipleImageUploadReturn } from "@/features/image-upload";

interface MultiImageUploadProps {
  uploadState: UseMultipleImageUploadReturn;
  maxImages: number;
}

export const MultiImageUpload = ({
  uploadState,
  maxImages,
}: MultiImageUploadProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { images, hasError, uploadError, addImage, removeImage } = uploadState;
  const canAddImage = images.length < maxImages;

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const availableSlots = Math.max(maxImages - images.length, 0);
    const files = Array.from(event.target.files || []).slice(0, availableSlots);

    for (const file of files) {
      if (images.length >= maxImages) {
        break;
      }

      try {
        await addImage(file);
      } catch (error) {
        console.error(error);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    if (canAddImage) {
      fileInputRef.current?.click();
    }
  };

  const handleUploadKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleUploadClick();
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();

    if (canAddImage) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const availableSlots = Math.max(maxImages - images.length, 0);
    const files = Array.from(event.dataTransfer.files).slice(0, availableSlots);

    for (const file of files) {
      if (images.length >= maxImages) {
        break;
      }

      if (file.type.startsWith("image/")) {
        try {
          await addImage(file);
        } catch (error) {
          console.error(error);
        }
      }
    }
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            Фото товара
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Первое фото станет обложкой в каталоге.
          </Typography>
        </Box>
        <Chip
          label={`${images.length} из ${maxImages} фото добавлено`}
          color={images.length > 0 ? "primary" : "default"}
          variant={images.length > 0 ? "filled" : "outlined"}
          size="small"
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <Grid container spacing={1.5}>
        {images.map((image, index) => {
          return (
            <Grid
              item
              xs={index === 0 ? 12 : 6}
              sm={4}
              md={3}
              key={`${image.id ?? image.preview}-${index}`}
            >
              <Paper
                elevation={0}
                sx={{
                  position: "relative",
                  height: { xs: index === 0 ? 220 : 156, sm: 150, md: 172 },
                  borderRadius: 2,
                  overflow: "hidden",
                  border: `1px solid ${
                    image.error
                      ? theme.palette.error.main
                      : image.id
                        ? alpha(theme.palette.success.main, 0.7)
                        : theme.palette.divider
                  }`,
                  bgcolor: "background.paper",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.background.paper, 0.92),
                  }}
                >
                  {image.isUploading ? (
                    <CircularProgress size={32} />
                  ) : image.error ? (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ p: 1.5, textAlign: "center" }}
                    >
                      {image.error}
                    </Typography>
                  ) : (
                    <img
                      src={image.preview}
                      alt={`Изображение ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </Box>

                {image.id && !image.isUploading && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      bgcolor: alpha(theme.palette.success.main, 0.92),
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 16, color: "white" }} />
                  </Box>
                )}

                <IconButton
                  size="small"
                  onClick={() => removeImage(index)}
                  disabled={image.isUploading}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: alpha(theme.palette.error.main, 0.9),
                    color: "white",
                    "&:hover": {
                      bgcolor: theme.palette.error.dark,
                    },
                  }}
                >
                  <Delete sx={{ fontSize: 16 }} />
                </IconButton>

                {index === 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      bgcolor: alpha(theme.palette.primary.main, 0.94),
                      color: "white",
                      px: 1.25,
                      py: 0.4,
                      borderRadius: 1.5,
                      fontSize: "0.625rem",
                      fontWeight: 700,
                    }}
                  >
                    Обложка
                  </Box>
                )}
              </Paper>
            </Grid>
          );
        })}

        {canAddImage && (
          <Grid item xs={images.length === 0 ? 12 : 6} sm={4} md={3}>
            <Paper
              elevation={0}
              role="button"
              tabIndex={0}
              onClick={handleUploadClick}
              onKeyDown={handleUploadKeyDown}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                position: "relative",
                height: {
                  xs: images.length === 0 ? 180 : 156,
                  sm: 150,
                  md: 172,
                },
                borderRadius: 2,
                overflow: "hidden",
                border: `1px dashed ${
                  isDragOver
                    ? theme.palette.primary.main
                    : alpha(theme.palette.text.primary, 0.18)
                }`,
                cursor: "pointer",
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                transition: "border-color 0.2s ease, background 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                },
                "&:focus-visible": {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Stack
                alignItems="center"
                justifyContent="center"
                spacing={1}
                sx={{
                  height: "100%",
                  px: 2,
                  textAlign: "center",
                  color: "text.secondary",
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: 58,
                    height: 58,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ImageOutlined
                    sx={{
                      fontSize: 52,
                      color: alpha(theme.palette.text.primary, 0.16),
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      right: -4,
                      bottom: 0,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Add sx={{ fontSize: 18 }} />
                  </Box>
                </Box>
                <Typography variant="body2" fontWeight={600}>
                  Добавить фото
                </Typography>
                {!isMobile && (
                  <Typography variant="caption">
                    Перетащите или выберите файл
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1.5 }}
      >
        Рекомендуем: квадратные фото, светлый фон, хорошее освещение. JPG, PNG,
        WebP до 5 МБ.
      </Typography>

      {hasError && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          Некоторые изображения не удалось загрузить. Попробуйте еще раз.
        </Alert>
      )}

      {uploadError && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {uploadError}
        </Alert>
      )}
    </Box>
  );
};
