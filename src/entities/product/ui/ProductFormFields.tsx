"use client";

import { Controller, Control, FieldErrors } from "react-hook-form";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Grid,
  Chip,
  Box,
  OutlinedInput,
  Stack,
  Typography,
} from "@mui/material";
import { Inventory } from "@mui/icons-material";
import type { CategoryModel } from "@/entities/category/@x/product";
import type { Currency } from "@/shared/types";
import type { EditableAvailability } from "../model/types";
import {
  getCurrencySymbol,
  productCategoryRules,
  productCountRules,
  productDescriptionRules,
  productNameRules,
  productPrepaymentRules,
  type ProductFormData,
} from "../model/form";

interface ProductFormFieldsProps {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
  categories: CategoryModel[];
  availability: EditableAvailability;
  currentCurrency: Currency;
}

export const ProductFormFields = ({
  control,
  errors,
  categories,
  availability,
  currentCurrency,
}: ProductFormFieldsProps) => {
  const currentSymbol = getCurrencySymbol(currentCurrency);

  return (
    <>
      <Grid item xs={12}>
        <Controller
          name="categoryIds"
          control={control}
          rules={productCategoryRules}
          render={({ field }) => (
            <FormControl
              fullWidth
              error={!!errors.categoryIds}
              sx={{
                "& .MuiFormHelperText-root": {
                  display: errors.categoryIds
                    ? "block"
                    : { xs: "none", sm: "block" },
                },
                "&:focus-within .MuiFormHelperText-root": {
                  display: "block",
                },
              }}
            >
              <InputLabel id="category-label">Категории товара</InputLabel>
              <Select
                labelId="category-label"
                id="categoryIds"
                multiple
                label="Категории товара"
                value={field.value}
                onChange={field.onChange}
                input={<OutlinedInput label="Категории товара" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((categoryId) => {
                      const category = categories.find(
                        (cat) => cat.id === categoryId,
                      );
                      return (
                        <Chip
                          key={categoryId}
                          label={category?.name || categoryId}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Checkbox checked={field.value.indexOf(category.id) > -1} />
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.categoryIds?.message ??
                  "Можно выбрать несколько категорий."}
              </FormHelperText>
            </FormControl>
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name="name"
          control={control}
          rules={productNameRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="name"
              label="Название товара"
              placeholder="Например: Подставка для телефона из PLA"
              error={!!errors.name}
              helperText={
                errors.name?.message ??
                "Короткое и понятное название помогает быстрее найти товар."
              }
              FormHelperTextProps={{
                sx: {
                  display: errors.name
                    ? "block"
                    : { xs: "none", sm: "block" },
                },
              }}
              sx={{
                "&:focus-within .MuiFormHelperText-root": {
                  display: "block",
                },
              }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Controller
          name="count"
          control={control}
          rules={productCountRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="count"
              label="Количество в наличии"
              type="text"
              placeholder="Например: 5"
              error={!!errors.count}
              helperText={
                errors.count?.message ?? "Сколько единиц готовы продать сейчас."
              }
              FormHelperTextProps={{
                sx: {
                  display: errors.count
                    ? "block"
                    : { xs: "none", sm: "block" },
                },
              }}
              sx={{
                "&:focus-within .MuiFormHelperText-root": {
                  display: "block",
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Inventory />
                  </InputAdornment>
                ),
                inputProps: {
                  inputMode: "numeric",
                },
              }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Stack spacing={0.5} sx={{ height: "100%", justifyContent: "center" }}>
          <Controller
            name="availability"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value === "PREORDER"}
                    onChange={(event) =>
                      field.onChange(
                        event.target.checked ? "PREORDER" : "PURCHASABLE",
                      )
                    }
                    color="primary"
                  />
                }
                label="Оформлять как предзаказ"
              />
            )}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            Включите, если товар изготавливается после заказа.
          </Typography>
        </Stack>
      </Grid>

      {availability === "PREORDER" && (
        <Grid item xs={12} sm={6}>
          <Controller
            name="prepaymentAmount"
            control={control}
            rules={productPrepaymentRules}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="prepaymentAmount"
                label="Сумма предоплаты"
                type="text"
                placeholder="Например: 500"
                error={!!errors.prepaymentAmount}
                helperText={
                  errors.prepaymentAmount?.message ??
                  "Сумма, которую покупатель платит сразу."
                }
                FormHelperTextProps={{
                  sx: {
                    display: errors.prepaymentAmount
                      ? "block"
                      : { xs: "none", sm: "block" },
                  },
                }}
                sx={{
                  "&:focus-within .MuiFormHelperText-root": {
                    display: "block",
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {currentSymbol}
                    </InputAdornment>
                  ),
                  inputProps: {
                    inputMode: "decimal",
                  },
                }}
              />
            )}
          />
        </Grid>
      )}

      <Grid item xs={12}>
        <Controller
          name="description"
          control={control}
          rules={productDescriptionRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="description"
              label="Описание и детали"
              multiline
              rows={4}
              placeholder="Материал, размеры, цвет, срок изготовления..."
              error={!!errors.description}
              helperText={
                errors.description?.message ??
                "Материал, размер и важные детали для покупателя."
              }
              FormHelperTextProps={{
                sx: {
                  display: errors.description
                    ? "block"
                    : { xs: "none", sm: "block" },
                },
              }}
              sx={{
                "&:focus-within .MuiFormHelperText-root": {
                  display: "block",
                },
              }}
            />
          )}
        />
      </Grid>
    </>
  );
};
