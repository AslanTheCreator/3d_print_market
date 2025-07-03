"use client";

import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import {
  Box,
  MenuItem,
  Typography,
  Container,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useCreateProduct } from "../hooks/useCreateProduct";
import { categoryApi } from "@/entities/category/api/categoryApi";
import { CategoryModel } from "@/shared/model/types/category";
import { styled } from "@mui/material/styles";
import { CloudUpload } from "@mui/icons-material";
import { Currency } from "@/shared/model/types";
import { imageApi } from "@/entities/image/api/imageApi";
import { Availability } from "@/entities/product/model/types";

// Список валют
const currencies: { code: Currency; symbol: string }[] = [
  { code: "RUB", symbol: "₽" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
];

// Стилизованный компонент для загрузки изображения
const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const ImagePreview = styled(Box)(({ theme }) => ({
  width: "100%",
  height: 150,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[100],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  position: "relative",
  [theme.breakpoints.up("sm")]: {
    height: 200,
  },
}));

// Тип для формы
interface FormValues {
  categoryId: string;
  name: string;
  price: string;
  currency: Currency;
  description: string;
  isPreorder: boolean;
  prepaymentAmount: string;
}

export const CreateProductForm = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [severity, setSeverity] = useState<"success" | "error">("success");
  const [imageId, setImageId] = useState<number[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [categories, setCategories] = useState<CategoryModel[]>([]);

  const { mutate: createProduct, isPending } = useCreateProduct();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!validateImage(file)) return;

      setImageError(null);
      setImage(file);
      setImagePreview(URL.createObjectURL(file));

      try {
        setIsUploadingImage(true);
        const response = await imageApi.saveImage(file, "PRODUCT");
        setImageId(response);
      } catch (error) {
        console.error("Ошибка при загрузке изображения:", error);
        setImageError("Не удалось загрузить изображение на сервер");
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const validateImage = (file: File): boolean => {
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Размер файла не должен превышать 5 МБ");
      resetImageState();
      return false;
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Пожалуйста, загрузите изображение");
      resetImageState();
      return false;
    }
    return true;
  };

  const resetImageState = () => {
    setImage(null);
    setImagePreview(null);
    setImageId([]);
  };

  const onSubmit = (data: FormValues) => {
    if (!image || !imageId.length) {
      setImageError("Пожалуйста, загрузите изображение товара");
      return;
    }

    const productData = createProductData(data);
    console.log("Данные товара для создания:", productData);

    createProduct(productData, {
      onSuccess: () => {
        handleSnackbar("Товар успешно создан!", "success");
        resetForm();
      },
      onError: () => {
        handleSnackbar("Произошла ошибка при создании товара", "error");
      },
    });
  };

  const createProductData = (data: FormValues) => ({
    categoryId: parseInt(data.categoryId),
    name: data.name,
    imageIds: imageId,
    price: parseFloat(data.price),
    currency: data.currency,
    description: data.description,
    availability: data.isPreorder
      ? "PREORDER"
      : ("PURCHASABLE" as Availability),
    prepaymentAmount: data.isPreorder ? parseFloat(data.prepaymentAmount) : 0,
    // Захардкоженные поля
    count: 1,
    originality: "ORIGINAL",
    externalUrl: undefined,
  });

  const handleSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSeverity(severity);
    setOpenSnackbar(true);
  };

  const resetForm = () => {
    reset();
    resetImageState();
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
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
            {/* Категория */}
            <Grid item xs={12}>
              <Controller
                name="categoryId"
                control={control}
                rules={{ required: "Выберите категорию товара" }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.categoryId}>
                    <InputLabel id="category-label">Категория</InputLabel>
                    <Select
                      labelId="category-label"
                      id="categoryId"
                      label="Категория"
                      {...field}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.categoryId && (
                      <FormHelperText>
                        {errors.categoryId.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Название товара */}
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Введите название товара",
                  minLength: {
                    value: 3,
                    message: "Минимальная длина названия 3 символа",
                  },
                  maxLength: {
                    value: 100,
                    message: "Максимальная длина названия 100 символов",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="name"
                    label="Название товара"
                    placeholder="Введите название товара"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Загрузка изображения */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Изображение товара*
              </Typography>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                fullWidth
                disabled={isUploadingImage}
                sx={{
                  height: 56,
                  borderColor: imageError ? "error.main" : undefined,
                  color: imageError ? "error.main" : undefined,
                }}
              >
                {isUploadingImage ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Загрузка...
                  </>
                ) : image ? (
                  "Изменить изображение"
                ) : (
                  "Загрузить изображение"
                )}
                <VisuallyHiddenInput
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isUploadingImage}
                />
              </Button>

              {imageError && (
                <FormHelperText error sx={{ mt: 1 }}>
                  {imageError}
                </FormHelperText>
              )}

              {imagePreview && (
                <ImagePreview>
                  <Image
                    src={imagePreview}
                    alt="Предпросмотр товара"
                    fill
                    sizes="(max-width: 600px) 100vw, 600px"
                    style={{ objectFit: "cover" }}
                  />
                </ImagePreview>
              )}
            </Grid>

            {/* Цена и Валюта */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="price"
                control={control}
                rules={{
                  required: "Введите цену товара",
                  pattern: {
                    value: /^\d+(\.\d{1,2})?$/,
                    message: "Введите корректную цену",
                  },
                  validate: (value) =>
                    parseFloat(value) > 0 || "Цена должна быть больше нуля",
                }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="price"
                    label="Цена"
                    type="number"
                    placeholder="0.00"
                    error={!!errors.price}
                    helperText={errors.price?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {currencies.find((c) => c.code === watch("currency"))
                            ?.symbol || "₽"}
                        </InputAdornment>
                      ),
                    }}
                    {...field}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="currency"
                control={control}
                rules={{ required: "Выберите валюту" }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.currency}>
                    <InputLabel id="currency-label">Валюта</InputLabel>
                    <Select
                      labelId="currency-label"
                      id="currency"
                      label="Валюта"
                      {...field}
                    >
                      {currencies.map((currency) => (
                        <MenuItem key={currency.code} value={currency.code}>
                          {currency.code} ({currency.symbol})
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.currency && (
                      <FormHelperText>{errors.currency.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Чекбокс предзаказа */}
            <Grid item xs={12}>
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
                    label="Предзаказ"
                  />
                )}
              />
            </Grid>

            {/* Сумма предоплаты (показывается только если выбран предзаказ) */}
            {isPreorder && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="prepaymentAmount"
                  control={control}
                  rules={{
                    required: "Введите сумму предоплаты",
                    pattern: {
                      value: /^\d+(\.\d{1,2})?$/,
                      message: "Введите корректную сумму",
                    },
                    validate: (value) =>
                      parseFloat(value) > 0 || "Сумма должна быть больше нуля",
                  }}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      id="prepaymentAmount"
                      label="Сумма предоплаты"
                      type="number"
                      placeholder="0.00"
                      error={!!errors.prepaymentAmount}
                      helperText={errors.prepaymentAmount?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {currencies.find(
                              (c) => c.code === watch("currency")
                            )?.symbol || "₽"}
                          </InputAdornment>
                        ),
                      }}
                      {...field}
                    />
                  )}
                />
              </Grid>
            )}

            {/* Описание товара */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                rules={{
                  maxLength: {
                    value: 1000,
                    message: "Максимальная длина описания 1000 символов",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="description"
                    label="Описание товара"
                    multiline
                    rows={4}
                    placeholder="Опишите ваш товар подробнее"
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Кнопка отправки */}
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
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={severity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
