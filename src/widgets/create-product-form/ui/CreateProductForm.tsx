"use client";

import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  CategoryOutlined,
  ImageOutlined,
  SellOutlined,
} from "@mui/icons-material";

import { CurrencyField, ProductFormFields } from "@/entities/product";
import { ErrorState } from "@/shared/ui/states";
import { MultiImageUpload } from "./components/MultiImageUpload";
import { CreateProductFormActions } from "./components/CreateProductFormActions";
import { CreateProductFormHeader } from "./components/CreateProductFormHeader";
import { CreateProductFormSection } from "./components/CreateProductFormSection";
import { useCreateProductForm } from "../model";

export const CreateProductForm = () => {
  const theme = useTheme();
  const {
    categories,
    control,
    currentCurrency,
    errors,
    handleBack,
    handleFormSubmit,
    imageUploadState,
    isCategoriesError,
    isCategoriesLoading,
    isFormValid,
    isPending,
    isPreorder,
    isSubmitting,
    publishRequirements,
    resetForm,
    retryLoadCategories,
  } = useCreateProductForm();

  const renderContent = () => {
    if (isCategoriesLoading) {
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
            Загружаем категории для нового товара...
          </Typography>
        </Box>
      );
    }

    if (isCategoriesError) {
      return (
        <ErrorState
          type="products"
          title="Не удалось загрузить категории"
          description="Форма создания товара требует список категорий. Попробуйте обновить данные и открыть форму снова."
          onRetry={() => {
            void retryLoadCategories();
          }}
          retryText="Повторить"
          minHeight={320}
          useContainer={false}
        />
      );
    }

    return (
      <>
        <Box
          component="form"
          onSubmit={handleFormSubmit}
          noValidate
          sx={{ p: { xs: 2, sm: 3, md: 4 } }}
        >
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <CreateProductFormSection
                icon={<ImageOutlined />}
                title="Фотографии"
              />
            </Grid>

            {/* Images Section */}
            <Grid item xs={12}>
              <MultiImageUpload uploadState={imageUploadState} maxImages={3} />
            </Grid>

            <Grid item xs={12}>
              <CreateProductFormSection
                icon={<CategoryOutlined />}
                title="Основная информация"
              />
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
              <CreateProductFormSection
                icon={<SellOutlined />}
                title="Цена и публикация"
              />
            </Grid>

            {/* Price and Currency */}
            <CurrencyField
              control={control}
              priceError={errors.price}
              currencyError={errors.currency}
              currentCurrency={currentCurrency}
            />

            {/* Submit Buttons */}
            <CreateProductFormActions
              isFormValid={isFormValid}
              isPending={isPending}
              isSubmitting={isSubmitting}
              isUploadingImages={imageUploadState.isUploading}
              publishRequirements={publishRequirements}
              onReset={resetForm}
            />
          </Grid>
        </Box>

      </>
    );
  };

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
        <CreateProductFormHeader onBack={handleBack} />

        {renderContent()}
      </Paper>
    </Container>
  );
};
