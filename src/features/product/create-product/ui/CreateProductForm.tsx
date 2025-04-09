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
} from "@mui/material";
import { useEffect, useState } from "react";
import { useCreateProduct } from "../hooks/useCreateProduct";
import { categoryApi } from "@/entities/category/api/categoryApi";
import { CategoryModel } from "@/shared/model/types/category";
import { styled } from "@mui/material/styles";
import { CloudUpload } from "@mui/icons-material";
import { Currency } from "@/shared/model/types";
import { imageApi } from "@/entities/image/api/imageApi";

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
  height: 200,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[100],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up("md")]: {
    height: 300,
  },
}));

// Тип для формы
interface FormValues {
  categoryId: string;
  name: string;
  price: string;
  currency: Currency;
  description: string;
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

  const { mutate: createProduct, isPending } = useCreateProduct();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      categoryId: "",
      name: "",
      price: "",
      currency: "RUB",
      description: "",
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Проверка размера файла (не более 5 МБ)
      if (file.size > 5 * 1024 * 1024) {
        setImageError("Размер файла не должен превышать 5 МБ");
        setImage(null);
        setImagePreview(null);
        setImageId([]);
        return;
      }

      // Проверка типа файла
      if (!file.type.startsWith("image/")) {
        setImageError("Пожалуйста, загрузите изображение");
        setImage(null);
        setImagePreview(null);
        setImageId([]);
        return;
      }

      setImageError(null);
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      try {
        setIsUploadingImage(true);
        const response = await imageApi.saveImage(file, "PRODUCT");
        setImageId(response); // Сохраняем ID изображения
        setIsUploadingImage(false);
      } catch (error) {
        console.error("Ошибка при загрузке изображения:", error);
        setImageError("Не удалось загрузить изображение на сервер");
        setIsUploadingImage(false);
      }
    }
  };

  const onSubmit = (data: FormValues) => {
    if (!image || !imageId) {
      setImageError("Пожалуйста, загрузите изображение товара");
      return;
    }

    const productData = {
      categoryId: parseInt(data.categoryId),
      name: data.name,
      imageIds: imageId,
      price: parseFloat(data.price),
      currency: data.currency,
      description: data.description,
      count: 1,
    };

    createProduct(productData, {
      onSuccess: () => {
        setSnackbarMessage("Товар успешно создан!");
        setSeverity("success");
        setOpenSnackbar(true);
        // Очистка формы после успешного создания
        reset();
        setImage(null);
        setImagePreview(null);
      },
      onError: () => {
        setSnackbarMessage("Произошла ошибка при создании товара");
        setSeverity("error");
        setOpenSnackbar(true);
      },
    });
  };

  const [categories, setCategories] = useState<CategoryModel[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await categoryApi.getCategories();
      setCategories(data);
    };
    fetchData();
  }, []);

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
                sx={{
                  height: 56,
                  borderColor: imageError ? "error.main" : undefined,
                  color: imageError ? "error.main" : undefined,
                }}
              >
                {image ? "Изменить изображение" : "Загрузить изображение"}
                <VisuallyHiddenInput
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Button>

              {imageError && (
                <FormHelperText error>{imageError}</FormHelperText>
              )}

              {imagePreview && (
                <ImagePreview>
                  <Image
                    src={imagePreview}
                    alt="Предпросмотр товара"
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    style={{ objectFit: "contain" }}
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
                          {currencies.find((c) => c.code === field.value)
                            ?.symbol ||
                            currencies.find((c) => c.code === "RUB")?.symbol}
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
                disabled={isPending}
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
