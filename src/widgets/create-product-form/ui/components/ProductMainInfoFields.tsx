import type React from "react";
import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
} from "@mui/material";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import {
  productCategoryRules,
  productDescriptionRules,
  productNameRules,
  type ProductFormData,
} from "@/entities/product";
import type { CategoryModel } from "@/shared/types";
import { flattenCategories } from "./productFormHelpers";

interface ProductMainInfoFieldsProps {
  categories: CategoryModel[];
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}

export const ProductMainInfoFields = ({
  categories,
  control,
  errors,
}: ProductMainInfoFieldsProps): React.ReactElement => {
  const flatCategories = flattenCategories(categories);

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
            <FormControl fullWidth required error={!!errors.categoryIds}>
              <InputLabel id="category-label">Категория</InputLabel>
              <Select
                labelId="category-label"
                id="categoryIds"
                multiple
                label="Категория"
                value={field.value}
                onChange={field.onChange}
                input={<OutlinedInput label="Категория" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((categoryId) => {
                      const category = flatCategories.find(
                        (item) => item.id === categoryId,
                      );

                      return (
                        <Chip
                          key={categoryId}
                          label={category?.name ?? categoryId}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {flatCategories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Checkbox checked={field.value.includes(category.id)} />
                    <Box
                      component="span"
                      sx={{ pl: category.depth * 2, whiteSpace: "normal" }}
                    >
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.categoryIds?.message ??
                  "Можно выбрать основную или вложенную категорию."}
              </FormHelperText>
            </FormControl>
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
