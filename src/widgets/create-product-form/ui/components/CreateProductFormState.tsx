import type React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { ErrorState } from "@/shared/ui/states";

interface CreateProductFormLoadingStateProps {
  isEditMode: boolean;
}

interface CreateProductFormErrorStateProps {
  type: "product" | "categories";
  onRetry: () => void;
}

export const CreateProductFormLoadingState = ({
  isEditMode,
}: CreateProductFormLoadingStateProps): React.ReactElement => {
  return (
    <Box
      sx={{
        minHeight: 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        {isEditMode
          ? "Загружаем товар для редактирования..."
          : "Загружаем категории для нового товара..."}
      </Typography>
    </Box>
  );
};

export const CreateProductFormErrorState = ({
  type,
  onRetry,
}: CreateProductFormErrorStateProps): React.ReactElement => {
  if (type === "product") {
    return (
      <ErrorState
        type="products"
        title="Не удалось загрузить товар"
        description="Попробуйте обновить данные и открыть форму редактирования снова."
        onRetry={onRetry}
        retryText="Повторить"
        minHeight={320}
        useContainer={false}
      />
    );
  }

  return (
    <ErrorState
      type="products"
      title="Не удалось загрузить категории"
      description="Форма товара требует список категорий. Попробуйте обновить данные и открыть форму снова."
      onRetry={onRetry}
      retryText="Повторить"
      minHeight={320}
      useContainer={false}
    />
  );
};
