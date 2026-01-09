"use client";

import { useForm } from "react-hook-form";
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Button,
  CircularProgress,
} from "@mui/material";

import { ImageUpload } from "@/shared/ui/image-upload";
import { CurrencyField } from "@/shared/ui/CurrencyField/CurrencyField";
import { ProductFormFields } from "@/entities/product/ui/ProductFormFields/ProductFormFields";

import {
  ProductFormData,
  mapFormDataToCreateModel,
  defaultProductFormValues,
} from "@/entities/product/model/form";
import { useNotification } from "@/app/providers";
import { useCreateProduct } from "@/entities/product";
import { useImageUpload } from "@/features/image-upload";
import { useCategories } from "@/entities/category";
import { ApiError } from "@/shared/lib/errorHandler";

export const CreateProductForm = () => {
  const { categories } = useCategories();
  const { showNotification } = useNotification();
  const { mutate: createProduct, isPending } = useCreateProduct();

  const {
    image,
    imagePreview,
    imageError,
    imageIds,
    isUploading: isUploadingImage,
    handleImageChange,
    resetImageState,
  } = useImageUpload("PRODUCT");

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: defaultProductFormValues,
  });

  const isPreorder = watch("isPreorder");
  const currentCurrency = watch("currency");

  const onSubmit = (data: ProductFormData) => {
    if (!image || !imageIds.length) {
      showNotification("Пожалуйста, загрузите изображение товара", "error");
      return;
    }

    if (!data.categoryIds.length) {
      showNotification("Пожалуйста, выберите хотя бы одну категорию", "error");
      return;
    }

    const productData = mapFormDataToCreateModel(data, imageIds);
    createProduct(productData, {
      onSuccess: () => {
        showNotification("Товар успешно создан!", "success");
        resetForm();
      },
      onError: (error) => {
        const errorMessage =
          error instanceof ApiError
            ? error.message
            : "Произошла ошибка при создании товара";

        showNotification(errorMessage, "error");
      },
    });
  };

  const resetForm = () => {
    reset(defaultProductFormValues);
    resetImageState();
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ mb: 3, fontWeight: 700 }}
        >
          Создание товара
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={3}>
            <ProductFormFields
              control={control}
              errors={errors}
              categories={categories}
              isPreorder={isPreorder}
              currentCurrency={currentCurrency}
            />

            {/* Image Upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Изображение товара
              </Typography>
              <ImageUpload
                onImageChange={handleImageChange}
                imagePreview={imagePreview}
                imageError={imageError}
                isUploading={isUploadingImage}
                onDeleteImage={resetImageState}
              />
            </Grid>

            {/* Price and Currency */}
            <CurrencyField
              control={control}
              priceError={errors.price}
              currencyError={errors.currency}
              currentCurrency={currentCurrency}
            />

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isPending || isUploadingImage}
                sx={{
                  mt: 2,
                  py: 1.5,
                  fontSize: { xs: "1rem", md: "1.1rem" },
                  fontWeight: 700,
                }}
              >
                {isPending ? (
                  <>
                    <CircularProgress
                      size={24}
                      color="inherit"
                      sx={{ mr: 1 }}
                    />
                    Создание...
                  </>
                ) : (
                  "Разместить товар"
                )}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};
