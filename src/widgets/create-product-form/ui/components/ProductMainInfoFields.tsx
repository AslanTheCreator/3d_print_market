import type React from "react";
import {
  Box,
  TextField,
} from "@mui/material";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import {
  productCategoryRules,
  productDescriptionRules,
  productNameRules,
  type ProductFormData,
} from "@/entities/product";
import type { CategoryModel } from "@/entities/category";
import { ProductCategoryPicker } from "./ProductCategoryPicker";

interface ProductMainInfoFieldsProps {
  categories: CategoryModel[];
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
  compactMobile?: boolean;
}

export const ProductMainInfoFields = ({
  categories,
  control,
  errors,
  compactMobile = false,
}: ProductMainInfoFieldsProps): React.ReactElement => {

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          md: "repeat(2, minmax(0, 1fr))",
        },
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Controller
          name="name"
          control={control}
          rules={productNameRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              required
              id="name"
              label="Название товара"
              placeholder="Например: Hatsune Miku Racing 2023 Ver."
              error={!!errors.name}
              helperText={errors.name?.message ?? "До 100 символов."}
            />
          )}
        />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Controller
          name="categoryIds"
          control={control}
          rules={productCategoryRules}
          render={({ field }) => (
            <ProductCategoryPicker
              categories={categories}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.categoryIds?.message}
              compactMobile={compactMobile}
            />
          )}
        />
      </Box>

      <Box sx={{ minWidth: 0, gridColumn: { md: "1 / -1" } }}>
        <Controller
          name="description"
          control={control}
          rules={productDescriptionRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="description"
              label="Описание товара"
              multiline
              rows={4}
              placeholder="Опишите комплектацию, размеры, особенности, дефекты или условия предзаказа."
              error={!!errors.description}
              helperText={
                errors.description?.message ??
                "Добавьте детали, которые помогут покупателю принять решение."
              }
            />
          )}
        />
      </Box>
    </Box>
  );
};
