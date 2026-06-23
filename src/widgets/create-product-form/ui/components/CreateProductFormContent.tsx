import type React from "react";
import { Box, Paper, Stack, useTheme } from "@mui/material";
import { CategoryOutlined, SellOutlined } from "@mui/icons-material";
import type { useProductForm } from "../../model";
import { PRODUCT_IMAGE_LIMIT } from "../../model";
import { MultiImageUpload } from "./MultiImageUpload";
import { CreateProductFormActions } from "./CreateProductFormActions";
import { CreateProductFormSection } from "./CreateProductFormSection";
import { ProductMainInfoFields } from "./ProductMainInfoFields";
import { ProductSaleFields } from "./ProductSaleFields";
import {
  CreateProductFormErrorState,
  CreateProductFormLoadingState,
} from "./CreateProductFormState";

type ProductFormState = ReturnType<typeof useProductForm>;

interface CreateProductFormContentProps {
  mode: "create" | "edit";
  formState: ProductFormState;
}

export const CreateProductFormContent = ({
  mode,
  formState,
}: CreateProductFormContentProps): React.ReactElement => {
  const theme = useTheme();

  if (formState.isProductLoading || formState.isCategoriesLoading) {
    return (
      <CreateProductFormLoadingState isEditMode={formState.isEditMode} />
    );
  }

  if (formState.isProductError) {
    return (
      <CreateProductFormErrorState
        type="product"
        onRetry={() => {
          void formState.retryLoadProduct();
        }}
      />
    );
  }

  if (formState.isCategoriesError) {
    return (
      <CreateProductFormErrorState
        type="categories"
        onRetry={() => {
          void formState.retryLoadCategories();
        }}
      />
    );
  }

  return (
    <Box component="form" onSubmit={formState.handleFormSubmit} noValidate>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 320px" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <MultiImageUpload
              uploadState={formState.imageUploadState}
              maxImages={PRODUCT_IMAGE_LIMIT}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack spacing={2}>
              <CreateProductFormSection
                icon={<CategoryOutlined />}
                title="Основная информация"
              />
              <ProductMainInfoFields
                control={formState.control}
                errors={formState.errors}
                categories={formState.categories}
              />
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack spacing={2}>
              <CreateProductFormSection
                icon={<SellOutlined />}
                title="Продажа"
              />
              <ProductSaleFields
                control={formState.control}
                errors={formState.errors}
                isPreorder={formState.isPreorder}
                currentCurrency={formState.currentCurrency}
              />
            </Stack>
          </Paper>
        </Stack>

        <Stack
          spacing={2}
          sx={{
            position: { lg: "sticky" },
            top: { lg: 96 },
          }}
        >
          <CreateProductFormActions
            mode={mode}
            isFormValid={formState.isFormValid}
            isPending={formState.isPending}
            isSubmitting={formState.isSubmitting}
            isUploadingImages={formState.imageUploadState.isUploading}
            publishRequirements={formState.publishRequirements}
            onReset={formState.resetForm}
          />
        </Stack>
      </Box>
    </Box>
  );
};
