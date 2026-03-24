"use client";

import { Paper, Typography, alpha, useTheme } from "@mui/material";

export const CreateProductFormHelp = () => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 3,
        p: 2,
        bgcolor: alpha(theme.palette.info.main, 0.05),
        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        borderRadius: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        <strong>Советы по созданию товара:</strong>
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div">
        • Первое изображение будет отображаться в каталоге
        <br />
        • Используйте качественные фотографии (рекомендуется от 800x800 px)
        <br />
        • Подробное описание увеличивает шансы на продажу
        <br />• Укажите точную категорию для лучшего поиска
      </Typography>
    </Paper>
  );
};
