"use client";

import { useState } from "react";
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Inventory } from "@mui/icons-material";
import { CategoryModel } from "@/shared/types";
import { Currency } from "@/shared/types";
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
  isPreorder: boolean;
  currentCurrency: Currency;
}

type FocusField =
  | "categoryIds"
  | "name"
  | "count"
  | "prepaymentAmount"
  | "description";

export const ProductFormFields = ({
  control,
  errors,
  categories,
  isPreorder,
  currentCurrency,
}: ProductFormFieldsProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const currentSymbol = getCurrencySymbol(currentCurrency);
  const [focusedField, setFocusedField] = useState<FocusField | null>(null);

  const getHelperText = (
    field: FocusField,
    errorMessage: string | undefined,
    defaultMessage: string,
  ) => {
    if (errorMessage) {
      return errorMessage;
    }

    if (!isMobile || focusedField === field) {
      return defaultMessage;
    }

    return undefined;
  };

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
              onFocus={() => setFocusedField("categoryIds")}
              onBlur={() => setFocusedField((prev) => (prev === "categoryIds" ? null : prev))}
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
                {getHelperText(
                  "categoryIds",
                  errors.categoryIds?.message,
                  "Можно выбрать несколько категорий.",
                )}
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
              helperText={getHelperText(
                "name",
                errors.name?.message,
                "Короткое и понятное название помогает быстрее найти товар.",
              )}
              onFocus={() => setFocusedField("name")}
              onBlur={(event) => {
                field.onBlur();
                setFocusedField((prev) => (prev === "name" ? null : prev));
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
              helperText={getHelperText(
                "count",
                errors.count?.message,
                "Сколько единиц готовы продать сейчас.",
              )}
              onFocus={() => setFocusedField("count")}
              onBlur={(event) => {
                field.onBlur();
                setFocusedField((prev) => (prev === "count" ? null : prev));
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
            name="isPreorder"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={field.onChange}
                    color="primary"
                  />
                }
                label="Оформлять как предзаказ"
              />
            )}
          />
          {!isMobile && (
            <Typography variant="caption" color="text.secondary">
              Включите, если товар изготавливается после заказа.
            </Typography>
          )}
        </Stack>
      </Grid>

      {isPreorder && (
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
                helperText={getHelperText(
                  "prepaymentAmount",
                  errors.prepaymentAmount?.message,
                  "Сумма, которую покупатель платит сразу.",
                )}
                onFocus={() => setFocusedField("prepaymentAmount")}
                onBlur={() =>
                  {
                    field.onBlur();
                    setFocusedField((prev) =>
                      prev === "prepaymentAmount" ? null : prev,
                    );
                  }
                }
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
              helperText={getHelperText(
                "description",
                errors.description?.message,
                "Материал, размер и важные детали для покупателя.",
              )}
              onFocus={() => setFocusedField("description")}
              onBlur={(event) => {
                field.onBlur();
                setFocusedField((prev) => (prev === "description" ? null : prev));
              }}
            />
          )}
        />
      </Grid>
    </>
  );
};
