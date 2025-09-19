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
  Snackbar,
  Alert,
} from "@mui/material";
import { useEffect, useState } from "react";

import { categoryApi } from "@/entities/category/api/categoryApi";
import { CategoryModel } from "@/shared/model/types/category";
import { ImageUploader } from "@/shared/ui/ImageUploader/ImageUploader";
import { CurrencyField } from "@/shared/ui/CurrencyField/CurrencyField";
import { ProductFormFields } from "@/entities/product/ui/ProductFormFields/ProductFormFields";

import {
  ProductFormData,
  createProductData,
} from "@/entities/product/lib/productFormHelpers";
import { useNotification } from "@/shared/hooks/useNotification";
import { useCreateProduct } from "@/entities/product";
import { useImageUpload } from "@/features/image-upload";

export const CreateProductForm = () => {
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const { notification, showNotification, hideNotification } =
    useNotification();
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
    defaultValues: {
      categoryId: "",
      name: "",
      price: "",
      currency: "RUB",
      description: "",
      isPreorder: false,
      prepaymentAmount: "",
    },
  });

  const isPreorder = watch("isPreorder");
  const currentCurrency = watch("currency");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryApi.getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Ошибка при загрузке категорий:", error);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = (data: ProductFormData) => {
    if (!image || !imageIds.length) {
      showNotification("Пожалуйста, загрузите изображение товара", "error");
      return;
    }

    const productData = createProductData(data, imageIds);

    createProduct(productData, {
      onSuccess: () => {
        showNotification("Товар успешно создан!", "success");
        resetForm();
      },
      onError: () => {
        showNotification("Произошла ошибка при создании товара", "error");
      },
    });
  };

  const resetForm = () => {
    reset();
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
                Изображение товара*
              </Typography>
              <ImageUploader
                onImageChange={handleImageChange}
                imagePreview={imagePreview}
                error={imageError}
                isUploading={isUploadingImage}
                hasImage={!!image}
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

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
