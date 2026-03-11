"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Divider,
  Stack,
  alpha,
  useTheme,
} from "@mui/material";
import { ArrowBack, CheckCircle } from "@mui/icons-material";

import {
  ProductFormFields,
  ProductFormData,
  mapFormDataToCreateModel,
  defaultProductFormValues,
  useCreateProduct,
} from "@/entities/product";
import { CurrencyField } from "./components/CurrencyField";
import { MultiImageUpload } from "./components/MultiImageUpload";
import { useNotification } from "@/shared/ui/notification";

import { useMultipleImageUpload } from "@/features/image-upload";
import { useCategories } from "@/entities/category";
import { ApiError, ErrorCodes } from "@/shared/lib/errorHandler";
import { AppLink } from "@/shared/ui/app-link/AppLink";

export const CreateProductForm = () => {
  const theme = useTheme();
  const router = useRouter();
  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const { showNotification } = useNotification();
  const { mutate: createProduct, isPending } = useCreateProduct();

  const imageUploadState = useMultipleImageUpload("PRODUCT", 3);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    defaultValues: defaultProductFormValues,
  });

  const isPreorder = watch("isPreorder");
  const currentCurrency = watch("currency");

  const onSubmit = (data: ProductFormData) => {
    if (!imageUploadState.imageIds.length) {
      showNotification(
        "Пожалуйста, загрузите хотя бы одно изображение товара",
        "error",
      );
      return;
    }

    if (!data.categoryIds.length) {
      showNotification("Пожалуйста, выберите хотя бы одну категорию", "error");
      return;
    }

    const productData = mapFormDataToCreateModel(
      data,
      imageUploadState.imageIds,
    );

    createProduct(productData, {
      onSuccess: () => {
        showNotification("Товар успешно создан!", "success");
        resetForm();
        setTimeout(() => router.push("/dashboard/products"), 1500);
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          if (error.isCode(ErrorCodes.TRANSFER_NOT_FOUND)) {
            showNotification(
              <>
                {error.message}.{" "}
                <AppLink
                  href="/dashboard/settings?tab=shipping"
                  color="primary"
                  underline="hover"
                  sx={{ fontWeight: 600 }}
                >
                  Настроить доставку →
                </AppLink>
              </>,
              "info",
            );
            return;
          }

          if (error.isCode(ErrorCodes.SOCIAL_NETWORK_NOT_FOUND)) {
            showNotification(
              <>
                {error.message}.{" "}
                <AppLink
                  href="/dashboard/settings?tab=contacts"
                  color={"inherit"}
                  sx={{ fontWeight: 600 }}
                >
                  Настроить соц. сети →
                </AppLink>
              </>,
              "info",
            );
            return;
          }

          showNotification(error.message, "error");
        } else {
          showNotification("Произошла ошибка при создании товара", "error");
        }
      },
    });
  };

  const resetForm = () => {
    reset(defaultProductFormValues);
    imageUploadState.resetImages();
  };

  const handleBack = () => {
    router.back();
  };

  const isFormValid = !imageUploadState.isUploading && isDirty;
  const isSubmitting = isPending || imageUploadState.isUploading;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.05,
            )}, ${alpha(theme.palette.secondary.main, 0.05)})`,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={handleBack}
              sx={{ minWidth: "auto" }}
            >
              Назад
            </Button>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                }}
              >
                Создание товара
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Заполните информацию о вашем товаре
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ p: { xs: 2, sm: 3, md: 4 } }}
        >
          <Grid container spacing={3}>
            {/* Images Section */}
            <Grid item xs={12}>
              <MultiImageUpload uploadState={imageUploadState} maxImages={3} />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Product Fields */}
            <ProductFormFields
              control={control}
              errors={errors}
              categories={categories}
              isPreorder={isPreorder}
              currentCurrency={currentCurrency}
            />

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Price and Currency */}
            <CurrencyField
              control={control}
              priceError={errors.price}
              currencyError={errors.currency}
              currentCurrency={currentCurrency}
            />

            {/* Submit Buttons */}
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
                    : imageUploadState.isUploading
                      ? "Загрузка изображений..."
                      : "Разместить товар"}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={resetForm}
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
          </Grid>
        </Box>
      </Paper>

      {/* Help Text */}
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
    </Container>
  );
};
