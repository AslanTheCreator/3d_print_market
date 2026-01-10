"use client";

import { useState, useRef } from "react";
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
} from "@mui/material";
import { CloudUpload, Delete, Image, CheckCircle } from "@mui/icons-material";
import { UseMultipleImageUploadReturn } from "@/features/image-upload";

interface MultiImageUploadProps {
  uploadState: UseMultipleImageUploadReturn;
  maxImages?: number;
}

export const MultiImageUpload = ({
  uploadState,
  maxImages = 3,
}: MultiImageUploadProps) => {
  const theme = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { images, isUploading, hasError, addImage, removeImage } = uploadState;

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

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
    if (images.length < maxImages) {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (images.length < maxImages) {
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

    const files = Array.from(event.dataTransfer.files);

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

  const canAddMore = images.length < maxImages;

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

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Изображения товара
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ({images.length}/{maxImages})
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {images.map((image, index) => (
          <Grid item xs={6} sm={4} key={index}>
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                paddingTop: "100%",
                borderRadius: 2,
                overflow: "hidden",
                border: `2px solid ${
                  image.error
                    ? theme.palette.error.main
                    : image.id
                    ? theme.palette.success.main
                    : theme.palette.divider
                }`,
                transition: "all 0.2s ease",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(theme.palette.background.paper, 0.9),
                }}
              >
                {image.isUploading ? (
                  <CircularProgress size={32} />
                ) : image.error ? (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ p: 1, textAlign: "center" }}
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
                    bgcolor: alpha(theme.palette.success.main, 0.9),
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
                  "&:disabled": {
                    bgcolor: alpha(theme.palette.action.disabled, 0.5),
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
                    bgcolor: alpha(theme.palette.primary.main, 0.9),
                    color: "white",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: "0.625rem",
                    fontWeight: 600,
                  }}
                >
                  Главное
                </Box>
              )}
            </Paper>
          </Grid>
        ))}

        {canAddMore && (
          <Grid item xs={6} sm={4}>
            <Paper
              elevation={0}
              onClick={handleUploadClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                position: "relative",
                paddingTop: "100%",
                borderRadius: 2,
                border: `2px dashed ${
                  isDragOver
                    ? theme.palette.primary.main
                    : theme.palette.divider
                }`,
                cursor: "pointer",
                transition: "all 0.2s ease",
                bgcolor: isDragOver
                  ? alpha(theme.palette.primary.main, 0.05)
                  : "transparent",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <CloudUpload
                  sx={{
                    fontSize: 40,
                    color: isDragOver
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textAlign: "center", px: 1 }}
                >
                  {isDragOver ? "Отпустите" : "Добавить фото"}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="caption">
          Первое изображение будет использовано как главное. Поддерживаются JPG,
          PNG, WebP. Максимум {maxImages} фото до 5 МБ каждое.
        </Typography>
      </Alert>

      {hasError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Некоторые изображения не удалось загрузить. Попробуйте еще раз.
        </Alert>
      )}
    </Box>
  );
};
