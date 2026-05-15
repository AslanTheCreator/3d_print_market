"use client";

import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import {
  AddShoppingCart,
  CategoryOutlined,
  FavoriteBorder,
  ImageNotSupportedOutlined,
  ImageOutlined,
  SellOutlined,
} from "@mui/icons-material";
import {
  Controller,
  Control,
  FieldErrors,
  useWatch,
} from "react-hook-form";

import {
  getCurrencySymbol,
  productCategoryRules,
  productCountRules,
  productCurrencies,
  productCurrencyRules,
  productDescriptionRules,
  productNameRules,
  productPrepaymentRules,
  productPriceRules,
  type ProductFormData,
} from "@/entities/product";
import { ErrorState } from "@/shared/ui/states";
import type { CategoryModel, Currency } from "@/shared/types";
import { PageHeader } from "@/shared/ui/page-header";
import { MultiImageUpload } from "./components/MultiImageUpload";
import { CreateProductFormActions } from "./components/CreateProductFormActions";
import { CreateProductFormSection } from "./components/CreateProductFormSection";
import { useProductForm } from "../model";

interface CreateProductFormProps {
  mode?: "create" | "edit";
  productId?: string;
}

interface ProductFieldsProps {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}

interface ProductMainInfoFieldsProps extends ProductFieldsProps {
  categories: CategoryModel[];
}

interface ProductSaleFieldsProps extends ProductFieldsProps {
  currentCurrency: Currency;
  isPreorder: boolean;
}

interface ProductPreviewPanelProps {
  categoryName: string;
  currency: Currency;
  imageSrc?: string;
  name: string;
  price: string;
}

const currencySymbols: Record<Currency, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
};

const getReadableCurrencySymbol = (currency: Currency) =>
  currencySymbols[currency] ?? getCurrencySymbol(currency);

const flattenCategories = (
  categories: CategoryModel[],
  depth = 0,
): Array<CategoryModel & { depth: number }> =>
  categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.childs, depth + 1),
  ]);

const getCategoryLabel = (
  categories: CategoryModel[],
  categoryIds: number[],
) => {
  const flatCategories = flattenCategories(categories);
  const category = flatCategories.find((item) => item.id === categoryIds[0]);

  return category?.name ?? "Категория не выбрана";
};

const ProductMainInfoFields = ({
  categories,
  control,
  errors,
}: ProductMainInfoFieldsProps) => {
  const flatCategories = flattenCategories(categories);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
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
      </Grid>

      <Grid item xs={12} md={6}>
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
      </Grid>

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
      </Grid>
    </Grid>
  );
};

const ProductSaleFields = ({
  control,
  currentCurrency,
  errors,
  isPreorder,
}: ProductSaleFieldsProps) => {
  const currentSymbol = getReadableCurrencySymbol(currentCurrency);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Controller
          name="isPreorder"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>
                Доступность
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={field.value ? "preorder" : "available"}
                onChange={(_, value: string | null) => {
                  if (!value) {
                    return;
                  }

                  field.onChange(value === "preorder");
                }}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 1,
                  "& .MuiToggleButton-root": {
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    py: 1,
                    fontWeight: 800,
                    textTransform: "none",
                    "&.Mui-selected": {
                      borderColor: "primary.main",
                      color: "primary.main",
                      bgcolor: "primary.50",
                    },
                  },
                }}
              >
                <ToggleButton value="available">В наличии</ToggleButton>
                <ToggleButton value="preorder">Предзаказ</ToggleButton>
              </ToggleButtonGroup>
            </FormControl>
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name="price"
          control={control}
          rules={productPriceRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              required
              id="price"
              label="Цена"
              placeholder="1490"
              error={!!errors.price}
              helperText={errors.price?.message ?? "Цена за одну единицу."}
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

      <Grid item xs={12} md={4}>
        <Controller
          name="currency"
          control={control}
          rules={productCurrencyRules}
          render={({ field }) => (
            <FormControl fullWidth required error={!!errors.currency}>
              <InputLabel id="currency-label">Валюта</InputLabel>
              <Select
                labelId="currency-label"
                id="currency"
                label="Валюта"
                {...field}
              >
                {productCurrencies.map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.code} ({getReadableCurrencySymbol(currency.code)})
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.currency?.message ?? "Валюта цены товара."}
              </FormHelperText>
            </FormControl>
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name="count"
          control={control}
          rules={productCountRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              required
              id="count"
              label="Количество"
              placeholder="1"
              error={!!errors.count}
              helperText={errors.count?.message ?? "Сколько единиц доступно."}
              inputProps={{ inputMode: "numeric" }}
            />
          )}
        />
      </Grid>

      {isPreorder && (
        <Grid item xs={12} md={4}>
          <Controller
            name="prepaymentAmount"
            control={control}
            rules={productPrepaymentRules}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                required
                id="prepaymentAmount"
                label="Предоплата"
                placeholder="500"
                error={!!errors.prepaymentAmount}
                helperText={
                  errors.prepaymentAmount?.message ??
                  "Сумма, которую покупатель платит сразу."
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
    </Grid>
  );
};

const ProductPreviewPanel = ({
  categoryName,
  currency,
  imageSrc,
  name,
  price,
}: ProductPreviewPanelProps) => {
  const theme = useTheme();
  const priceNumber = Number.parseFloat(price);
  const priceLabel = Number.isFinite(priceNumber) && priceNumber > 0
    ? `${priceNumber.toLocaleString("ru-RU")} ${getReadableCurrencySymbol(
        currency,
      )}`
    : `0 ${getReadableCurrencySymbol(currency)}`;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
        Предпросмотр товара
      </Typography>

      <Paper
        elevation={0}
        sx={{
          overflow: "hidden",
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: 238,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageSrc ? (
            <Box
              component="img"
              src={imageSrc}
              alt={name}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <Stack alignItems="center" spacing={1} color="text.disabled">
              <ImageNotSupportedOutlined sx={{ fontSize: 62 }} />
              <Typography variant="body2">Фото появится здесь</Typography>
            </Stack>
          )}

          <IconButton
            size="small"
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              bgcolor: "background.paper",
              "&:hover": { bgcolor: "background.paper" },
            }}
          >
            <FavoriteBorder />
          </IconButton>
        </Box>

        <Stack spacing={1} sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {categoryName}
          </Typography>
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{
              minHeight: 48,
              display: "-webkit-box",
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {name || "Название товара"}
          </Typography>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="h6" color="primary.main" fontWeight={900}>
              {priceLabel}
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddShoppingCart />}
              sx={{ borderRadius: 1.5, fontWeight: 800 }}
            >
              Купить
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Paper>
  );
};

export const CreateProductForm = ({
  mode = "create",
  productId,
}: CreateProductFormProps) => {
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
    isEditMode,
    isFormValid,
    isPending,
    isPreorder,
    isProductError,
    isProductLoading,
    isSubmitting,
    publishRequirements,
    resetForm,
    retryLoadCategories,
    retryLoadProduct,
  } = useProductForm({ mode, productId });
  const watchedName = useWatch({ control, name: "name" });
  const watchedPrice = useWatch({ control, name: "price" });
  const watchedCategoryIds = useWatch({ control, name: "categoryIds" });
  const imagePreview = imageUploadState.images[0]?.preview;

  const renderContent = () => {
    if (isProductLoading || isCategoriesLoading) {
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
            {isEditMode
              ? "Загружаем товар для редактирования..."
              : "Загружаем категории для нового товара..."}
          </Typography>
        </Box>
      );
    }

    if (isProductError) {
      return (
        <ErrorState
          type="products"
          title="Не удалось загрузить товар"
          description="Попробуйте обновить данные и открыть форму редактирования снова."
          onRetry={() => {
            void retryLoadProduct();
          }}
          retryText="Повторить"
          minHeight={320}
          useContainer={false}
        />
      );
    }

    if (isCategoriesError) {
      return (
        <ErrorState
          type="products"
          title="Не удалось загрузить категории"
          description="Форма товара требует список категорий. Попробуйте обновить данные и открыть форму снова."
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
      <Box component="form" onSubmit={handleFormSubmit} noValidate>
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
              <MultiImageUpload uploadState={imageUploadState} maxImages={3} />
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
                  control={control}
                  errors={errors}
                  categories={categories}
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
                  control={control}
                  errors={errors}
                  isPreorder={isPreorder}
                  currentCurrency={currentCurrency}
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
            <ProductPreviewPanel
              imageSrc={imagePreview}
              name={watchedName}
              price={watchedPrice}
              currency={currentCurrency}
              categoryName={getCategoryLabel(categories, watchedCategoryIds)}
            />

            <CreateProductFormActions
              mode={mode}
              isFormValid={isFormValid}
              isPending={isPending}
              isSubmitting={isSubmitting}
              isUploadingImages={imageUploadState.isUploading}
              publishRequirements={publishRequirements}
              onReset={resetForm}
            />
          </Stack>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%", py: { xs: 2, sm: 3 } }}>
      <PageHeader
        title={isEditMode ? "Редактировать товар" : "Создать товар"}
        subtitle="Добавьте фото, описание, категорию, цену и количество."
        icon={<SellOutlined />}
        backLabel="К товарам"
        onBack={isEditMode ? handleBack : undefined}
        actions={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              icon={<ImageOutlined />}
              label={`${imageUploadState.images.length}/3 фото`}
              variant="outlined"
              size="small"
            />
            <Chip
              label={isPreorder ? "Предзаказ" : "В наличии"}
              color="primary"
              size="small"
            />
          </Stack>
        }
      />

      {renderContent()}
    </Box>
  );
};
