"use client";

import { Button, CircularProgress, Grid, Stack } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";

interface CreateProductFormActionsProps {
  isFormValid: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  isUploadingImages: boolean;
  onReset: () => void;
}

export const CreateProductFormActions = ({
  isFormValid,
  isPending,
  isSubmitting,
  isUploadingImages,
  onReset,
}: CreateProductFormActionsProps) => {
  return (
    <Grid item xs={12}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mt: 2 }}
      >
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={!isFormValid || isSubmitting}
          startIcon={
            isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <CheckCircle />
            )
          }
          sx={{
            py: 1.5,
            fontSize: { xs: "1rem", md: "1.1rem" },
            fontWeight: 700,
            boxShadow: "0 4px 16px rgba(239, 66, 132, 0.3)",
            "&:hover": {
              boxShadow: "0 6px 20px rgba(239, 66, 132, 0.4)",
            },
          }}
        >
          {isPending
            ? "Создание..."
            : isUploadingImages
              ? "Загрузка изображений..."
              : "Разместить товар"}
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={onReset}
          disabled={isSubmitting}
          sx={{
            py: 1.5,
            fontSize: { xs: "1rem", md: "1.1rem" },
            fontWeight: 600,
            minWidth: { sm: 180 },
          }}
        >
          Очистить форму
        </Button>
      </Stack>
    </Grid>
  );
};
