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
  Chip,
  useMediaQuery,
} from "@mui/material";
import { CloudUpload, Delete, CheckCircle } from "@mui/icons-material";
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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { images, hasError, addImage, removeImage } = uploadState;

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
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
  const isEmpty = images.length === 0;
  const infoChips = isMobile
    ? [`До ${maxImages} фото`, "1-е главное"]
    : [`До ${maxImages} фото`, "JPG, PNG, WebP", "До 5 МБ", "1-е фото — главное"];

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

      <Stack spacing={{ xs: 1, sm: 1.5 }} sx={{ mb: { xs: 1.5, sm: 2.5 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={0.75}
        >
          <Box>
            <Typography
              variant={isMobile ? "body2" : "subtitle1"}
              fontWeight={700}
            >
              Изображения товара
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isMobile
                ? "Первое фото станет обложкой."
                : "Покажите товар с разных ракурсов. Первое фото станет обложкой в каталоге."}
            </Typography>
          </Box>
          <Chip
            label={`${images.length}/${maxImages} фото`}
            color={images.length > 0 ? "primary" : "default"}
            variant={images.length > 0 ? "filled" : "outlined"}
            size="small"
            sx={{ fontWeight: 700, height: isMobile ? 24 : 28 }}
          />
        </Stack>

        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {infoChips.map((item) => (
            <Chip
              key={item}
              label={item}
              size="small"
              variant="outlined"
              sx={{ height: isMobile ? 22 : 24 }}
            />
          ))}
        </Stack>
      </Stack>

      <Grid container spacing={{ xs: 1.25, sm: 2 }}>
        {images.map((image, index) => (
          <Grid item xs={6} sm={4} key={index}>
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                paddingTop: "100%",
                borderRadius: { xs: 2, sm: 2.5 },
                overflow: "hidden",
                border: `2px solid ${
                  image.error
                    ? theme.palette.error.main
                    : image.id
                      ? theme.palette.success.main
                      : theme.palette.divider
                }`,
                transition: "all 0.2s ease",
                boxShadow:
                  index === 0 && image.id
                    ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.16)}`
                    : "none",
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
                  bgcolor: alpha(theme.palette.background.paper, 0.92),
                }}
              >
                {image.isUploading ? (
                  <CircularProgress size={isMobile ? 28 : 32} />
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
                    bgcolor: alpha(theme.palette.success.main, 0.92),
                    borderRadius: "50%",
                    width: isMobile ? 22 : 24,
                    height: isMobile ? 22 : 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle
                    sx={{ fontSize: isMobile ? 14 : 16, color: "white" }}
                  />
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
                  p: isMobile ? 0.5 : undefined,
                  "&:hover": {
                    bgcolor: theme.palette.error.dark,
                  },
                  "&:disabled": {
                    bgcolor: alpha(theme.palette.action.disabled, 0.5),
                  },
                }}
              >
                <Delete sx={{ fontSize: isMobile ? 15 : 16 }} />
              </IconButton>

              {index === 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    bgcolor: alpha(theme.palette.primary.main, 0.94),
                    color: "white",
                    px: isMobile ? 1 : 1.25,
                    py: 0.4,
                    borderRadius: 1.5,
                    fontSize: isMobile ? "0.58rem" : "0.625rem",
                    fontWeight: 700,
                  }}
                >
                  {isMobile ? "Обложка" : "Главное фото"}
                </Box>
              )}
            </Paper>
          </Grid>
        ))}

        {canAddMore && (
          <Grid item xs={isEmpty ? 12 : 6} sm={isEmpty ? 12 : 4}>
            <Paper
              elevation={0}
              onClick={handleUploadClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                position: "relative",
                paddingTop: isEmpty
                  ? { xs: "34%", sm: "28%" }
                  : "100%",
                borderRadius: { xs: 2, sm: 2.5 },
                border: `2px dashed ${
                  isDragOver
                    ? theme.palette.primary.main
                    : theme.palette.divider
                }`,
                cursor: "pointer",
                transition: "all 0.2s ease",
                bgcolor: isDragOver
                  ? alpha(theme.palette.primary.main, 0.06)
                  : alpha(theme.palette.primary.main, 0.02),
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
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
                  gap: isMobile ? 0.5 : 1,
                  px: isMobile ? 1.5 : 2,
                  textAlign: "center",
                }}
              >
                <CloudUpload
                  sx={{
                    fontSize: isEmpty
                      ? isMobile
                        ? 32
                        : 44
                      : isMobile
                        ? 28
                        : 36,
                    color: isDragOver
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                  }}
                />
                <Typography
                  variant={isEmpty ? (isMobile ? "caption" : "body2") : "caption"}
                  fontWeight={700}
                >
                  {isDragOver
                    ? isMobile
                      ? "Отпустите для загрузки"
                      : "Отпустите файлы, чтобы загрузить"
                    : isEmpty
                      ? isMobile
                        ? "Нажмите или перетащите фото"
                        : "Перетащите фото сюда или нажмите для выбора"
                      : "Добавить фото"}
                </Typography>
                {isEmpty && !isMobile && (
                  <Typography variant="caption" color="text.secondary">
                    Подойдут изображения товара на светлом фоне, детали и несколько ракурсов.
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Alert severity="info" sx={{ mt: { xs: 1.5, sm: 2 }, py: isMobile ? 0 : undefined }}>
        <Typography variant="caption">
          {isMobile
            ? "Хорошие фото заметно повышают шанс продажи."
            : "Чем лучше фотографии, тем выше шанс, что товар откроют и добавят в заказ."}
        </Typography>
      </Alert>

      {hasError && (
        <Alert severity="error" sx={{ mt: { xs: 1.5, sm: 2 }, py: isMobile ? 0 : undefined }}>
          Некоторые изображения не удалось загрузить. Попробуйте еще раз.
        </Alert>
      )}
    </Box>
  );
};
