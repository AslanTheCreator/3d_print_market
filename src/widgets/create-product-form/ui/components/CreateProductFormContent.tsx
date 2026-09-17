import type React from "react";
import { Alert, Box, Button, Paper, Stack, useTheme } from "@mui/material";
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
  CreateProductFormReadOnlyState,
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
  const compactMobile = mode === "create";

  if (formState.isProductLoading) {
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

  if (formState.isProductReadOnly) {
    return <CreateProductFormReadOnlyState />;
  }

  if (formState.isCategoriesLoading) {
    return (
      <CreateProductFormLoadingState isEditMode={formState.isEditMode} />
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
    <Box component="form" onSubmit={formState.handleFormSubmit} noValidate aria-label="Форма товара"
      sx={compactMobile ? {
        pb: { xs: "calc(var(--product-publish-height, 132px) + var(--product-keyboard-offset, 0px) + 16px)", md: 0 },
        "& input, & textarea, & button, & [role=combobox]": {
          scrollMarginTop: "calc(var(--shell-sticky-top, 64px) + 16px)",
          scrollMarginBottom: { xs: "calc(var(--product-publish-height, 132px) + 16px)", md: 16 },
        },
        "& input, & textarea": { fontSize: { xs: "1rem", md: "inherit" } },
      } : undefined}
    >
      {compactMobile && formState.draftImageError && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button disabled={!formState.isDraftReady} onClick={formState.retryDraftImages} sx={{ minHeight: 44 }}>Повторить</Button>
        }>
          Не удалось восстановить фото черновика. Данные сохранены; повторите загрузку фото.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 320px" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Stack spacing={compactMobile ? { xs: 1.5, md: 2 } : 2} sx={{ minWidth: 0 }}>
          <Paper
            elevation={0}
            sx={{
              p: compactMobile ? { xs: 1.5, md: 2.5 } : { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <MultiImageUpload
              uploadState={formState.imageUploadState}
              maxImages={PRODUCT_IMAGE_LIMIT}
              compactMobile={compactMobile}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: compactMobile ? { xs: 1.5, md: 2.5 } : { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack spacing={2}>
              <CreateProductFormSection
                icon={<CategoryOutlined />}
                title="Основная информация"
                compactMobile={compactMobile}
              />
              <ProductMainInfoFields
                control={formState.control}
                errors={formState.errors}
                categories={formState.categories}
                compactMobile={compactMobile}
              />
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: compactMobile ? { xs: 1.5, md: 2.5 } : { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack spacing={2}>
              <CreateProductFormSection
                icon={<SellOutlined />}
                title="Продажа"
                compactMobile={compactMobile}
              />
              <ProductSaleFields
                control={formState.control}
                errors={formState.errors}
                availability={formState.availability}
                currentCurrency={formState.currentCurrency}
                compactMobile={compactMobile}
              />
            </Stack>
          </Paper>
        </Stack>

        <Stack
          spacing={2}
          sx={{
            position: { lg: "sticky" },
            top: { lg: "calc(var(--shell-sticky-top) + 16px)" },
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
            hasFormData={formState.hasFormData}
            draftStatus={formState.draftStatus}
            isDraftReady={formState.isDraftReady}
            draftImageError={formState.draftImageError}
            fieldErrors={formState.errors}
            availability={formState.availability}
            hasPrepayment={formState.hasPrepayment}
          />
        </Stack>
      </Box>
    </Box>
  );
};
