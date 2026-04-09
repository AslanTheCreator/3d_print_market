"use client";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CheckCircle, CheckCircleOutline } from "@mui/icons-material";

interface CreateProductFormActionsProps {
  isFormValid: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  isUploadingImages: boolean;
  mode?: "create" | "edit";
  onReset: () => void;
  publishRequirements: {
    hasImages: boolean;
    hasCategories: boolean;
    hasName: boolean;
    hasPrice: boolean;
  };
}

export const CreateProductFormActions = ({
  isFormValid,
  isPending,
  isSubmitting,
  isUploadingImages,
  mode = "create",
  onReset,
  publishRequirements,
}: CreateProductFormActionsProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isEditMode = mode === "edit";

  const requirementItems = [
    {
      label: "Фото",
      done: publishRequirements.hasImages,
    },
    {
      label: isMobile ? "Катег." : "Категория",
      done: publishRequirements.hasCategories,
    },
    {
      label: isMobile ? "Назв." : "Название",
      done: publishRequirements.hasName,
    },
    {
      label: "Цена",
      done: publishRequirements.hasPrice,
    },
  ];

  const allRequirementsDone = requirementItems.every((item) => item.done);

  const statusText = isUploadingImages
    ? isMobile
      ? "Сначала дождитесь загрузки фото."
      : isEditMode
        ? "Дождитесь завершения загрузки изображений, затем изменения можно будет сохранить."
        : "Дождитесь завершения загрузки изображений, затем товар можно будет разместить."
    : allRequirementsDone
      ? isMobile
        ? "Все обязательное заполнено."
        : isEditMode
          ? "Основные данные заполнены. Можно переходить к сохранению изменений."
          : "Основные данные заполнены. Можно переходить к публикации."
      : isMobile
        ? "Заполните обязательные пункты ниже."
        : isEditMode
          ? "Для сохранения заполните обязательные пункты ниже."
          : "Для публикации заполните обязательные пункты ниже.";

  return (
    <Grid item xs={12}>
      <Paper
        elevation={0}
        sx={{
          mt: 0.5,
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: { xs: 2, sm: 2.5 },
          border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
          bgcolor: alpha(theme.palette.primary.main, 0.035),
        }}
      >
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <Box>
            <Typography
              variant={isMobile ? "body2" : "subtitle1"}
              fontWeight={700}
            >
              {isEditMode ? "Готовность к сохранению" : "Готовность к публикации"}
            </Typography>
            <Typography
              variant={isMobile ? "caption" : "body2"}
              color="text.secondary"
              sx={{ mt: 0.25 }}
            >
              {statusText}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {requirementItems.map((item) => (
              <Chip
                key={item.label}
                label={item.label}
                icon={
                  item.done ? (
                    <CheckCircleOutline />
                  ) : (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "currentColor",
                        ml: 1.1,
                      }}
                    />
                  )
                }
                color={item.done ? "success" : "default"}
                variant={item.done ? "filled" : "outlined"}
                size="small"
                sx={{
                  height: isMobile ? 24 : 28,
                  fontWeight: 600,
                  bgcolor: item.done
                    ? undefined
                    : alpha(theme.palette.background.paper, 0.9),
                  "& .MuiChip-label": {
                    px: isMobile ? 0.75 : 1,
                  },
                  "& .MuiChip-icon": {
                    fontSize: isMobile ? 14 : 16,
                  },
                }}
              />
            ))}
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{ pt: 0.25 }}
          >
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={!isFormValid || isSubmitting}
              startIcon={
                isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <CheckCircle />
                )
              }
              sx={{
                py: { xs: 1.25, sm: 1.5 },
                fontSize: { xs: "0.95rem", md: "1.1rem" },
                fontWeight: 700,
                boxShadow: "0 4px 16px rgba(239, 66, 132, 0.22)",
                "&:hover": {
                  boxShadow: "0 6px 20px rgba(239, 66, 132, 0.3)",
                },
              }}
            >
              {isPending
                ? isEditMode
                  ? "Сохранение..."
                  : "Создание..."
                : isUploadingImages
                  ? "Загрузка фото..."
                  : isEditMode
                    ? "Сохранить изменения"
                    : "Разместить товар"}
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={onReset}
              disabled={isSubmitting}
              sx={{
                py: { xs: 1.1, sm: 1.5 },
                fontSize: { xs: "0.95rem", md: "1.05rem" },
                fontWeight: 600,
                minWidth: { sm: 180 },
              }}
            >
              {isMobile
                ? isEditMode
                  ? "Сбросить"
                  : "Очистить"
                : isEditMode
                  ? "Сбросить изменения"
                  : "Очистить форму"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Grid>
  );
};
