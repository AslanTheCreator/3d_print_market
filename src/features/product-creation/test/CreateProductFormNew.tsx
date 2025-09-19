// Улучшенная версия формы создания товара с пошаговым интерфейсом для десктопов

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
  Card,
  CardContent,
  Divider,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  useMediaQuery,
  useTheme,
  Fade,
  Slide,
} from "@mui/material";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ShoppingBag,
  Image as ImageIcon,
  AttachMoney,
  Description,
  Category,
  CheckCircle,
} from "@mui/icons-material";

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

const steps = [
  {
    label: "Основная информация",
    description: "Название, категория и описание товара",
    icon: <ShoppingBag />,
  },
  {
    label: "Изображение",
    description: "Загрузите фото товара",
    icon: <ImageIcon />,
  },
  {
    label: "Цена и валюта",
    description: "Установите стоимость товара",
    icon: <AttachMoney />,
  },
];

export const CreateProductForm = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

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
    formState: { errors, isValid },
    trigger,
  } = useForm<ProductFormData>({
    mode: "onChange",
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

  // Отдельно отслеживаем нужные поля
  const categoryId = watch("categoryId");
  const name = watch("name");
  const description = watch("description");
  const price = watch("price");
  const currency = watch("currency");

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

  // Проверяем завершенность шагов
  useEffect(() => {
    const newCompletedSteps = new Set<number>();

    // Шаг 1: Основная информация
    if (categoryId && name && description) {
      newCompletedSteps.add(0);
    }

    // Шаг 2: Изображение
    if (image && imageIds.length > 0) {
      newCompletedSteps.add(1);
    }

    // Шаг 3: Цена
    if (price && currency) {
      newCompletedSteps.add(2);
    }

    setCompletedSteps((prev) => {
      // Сравниваем множества чтобы избежать лишних обновлений
      if (prev.size !== newCompletedSteps.size) {
        return newCompletedSteps;
      }

      for (const step of newCompletedSteps) {
        if (!prev.has(step)) {
          return newCompletedSteps;
        }
      }

      return prev;
    });
  }, [categoryId, name, description, image, imageIds, price, currency]);

  const handleStepClick = useCallback((step: number) => {
    setActiveStep(step);
  }, []);

  const validateCurrentStep = useCallback(async () => {
    let fieldsToValidate: string[] = [];

    switch (activeStep) {
      case 0:
        fieldsToValidate = ["categoryId", "name", "description"];
        break;
      case 1:
        if (!image || !imageIds.length) {
          showNotification("Пожалуйста, загрузите изображение товара", "error");
          return false;
        }
        return true;
      case 2:
        fieldsToValidate = ["price", "currency"];
        if (isPreorder) {
          fieldsToValidate.push("prepaymentAmount");
        }
        break;
    }

    const result = await trigger(fieldsToValidate as any);
    return result;
  }, [activeStep, image, imageIds, isPreorder, showNotification, trigger]);

  const handleNext = useCallback(async () => {
    const isStepValid = await validateCurrentStep();
    if (isStepValid && activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  }, [validateCurrentStep, activeStep]);

  const handleBack = useCallback(() => {
    setActiveStep(activeStep - 1);
  }, [activeStep]);

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

  const resetForm = useCallback(() => {
    reset();
    resetImageState();
    setActiveStep(0);
    setCompletedSteps(new Set());
  }, [reset, resetImageState]);

  const renderStepContent = useCallback(
    (step: number) => {
      switch (step) {
        case 0:
          return (
            <Fade in={activeStep === 0} timeout={300}>
              <Box>
                <Grid container spacing={3}>
                  <ProductFormFields
                    control={control}
                    errors={errors}
                    categories={categories}
                    isPreorder={isPreorder}
                    currentCurrency={currentCurrency}
                  />
                </Grid>
              </Box>
            </Fade>
          );

        case 1:
          return (
            <Fade in={activeStep === 1} timeout={300}>
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                  Изображение товара*
                </Typography>
                <ImageUploader
                  onImageChange={handleImageChange}
                  imagePreview={imagePreview}
                  error={imageError}
                  isUploading={isUploadingImage}
                  hasImage={!!image}
                />
              </Box>
            </Fade>
          );

        case 2:
          return (
            <Fade in={activeStep === 2} timeout={300}>
              <Box>
                <Grid container spacing={3}>
                  <CurrencyField
                    control={control}
                    priceError={errors.price}
                    currencyError={errors.currency}
                    currentCurrency={currentCurrency}
                  />
                </Grid>
              </Box>
            </Fade>
          );

        default:
          return null;
      }
    },
    [
      activeStep,
      control,
      errors,
      categories,
      isPreorder,
      currentCurrency,
      handleImageChange,
      imagePreview,
      imageError,
      isUploadingImage,
      image,
    ]
  );

  if (!isDesktop) {
    // Возвращаем оригинальную версию для мобильных устройств
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

              <CurrencyField
                control={control}
                priceError={errors.price}
                currencyError={errors.currency}
                currentCurrency={currentCurrency}
              />

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
  }

  // Десктопная версия с улучшенным UI/UX
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Slide direction="up" in mountOnEnter unmountOnExit>
        <Box>
          {/* Заголовок с индикатором прогресса */}
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 2,
              }}
            >
              Создание товара
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Заполните информацию о вашем товаре пошагово
            </Typography>

            {/* Индикатор прогресса */}
            <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Box
                    key={index}
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Chip
                      icon={
                        completedSteps.has(index) ? (
                          <CheckCircle />
                        ) : (
                          steps[index].icon
                        )
                      }
                      label={`${index + 1}`}
                      color={
                        completedSteps.has(index)
                          ? "success"
                          : activeStep === index
                          ? "primary"
                          : "default"
                      }
                      variant={activeStep === index ? "filled" : "outlined"}
                      sx={{
                        height: 40,
                        "& .MuiChip-icon": {
                          fontSize: 18,
                        },
                      }}
                    />
                    {index < 2 && (
                      <Box
                        sx={{
                          width: 40,
                          height: 2,
                          backgroundColor: completedSteps.has(index)
                            ? theme.palette.success.main
                            : theme.palette.divider,
                          mx: 1,
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <Grid container spacing={4}>
            {/* Левая колонка - Навигация по шагам */}
            <Grid item xs={12} md={4}>
              <Card
                elevation={3}
                sx={{
                  position: "sticky",
                  top: 120,
                  borderRadius: 3,
                  overflow: "visible",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Шаги создания
                  </Typography>

                  <Stepper
                    activeStep={activeStep}
                    orientation="vertical"
                    sx={{
                      "& .MuiStepConnector-line": {
                        borderColor: theme.palette.divider,
                      },
                    }}
                  >
                    {steps.map((step, index) => (
                      <Step key={step.label}>
                        <StepLabel
                          onClick={() => handleStepClick(index)}
                          sx={{
                            cursor: "pointer",
                            "& .MuiStepLabel-label": {
                              fontWeight: activeStep === index ? 600 : 400,
                              color: completedSteps.has(index)
                                ? theme.palette.success.main
                                : activeStep === index
                                ? theme.palette.primary.main
                                : theme.palette.text.secondary,
                            },
                          }}
                        >
                          <Box>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: "inherit" }}
                            >
                              {step.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", mt: 0.5 }}
                            >
                              {step.description}
                            </Typography>
                          </Box>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  <Divider sx={{ my: 3 }} />

                  {/* Краткая сводка заполненных данных */}
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 2, fontWeight: 600 }}
                  >
                    Прогресс заполнения:
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {completedSteps.has(0) && (
                      <Chip
                        size="small"
                        icon={<CheckCircle />}
                        label="Основная информация"
                        color="success"
                        variant="outlined"
                      />
                    )}
                    {completedSteps.has(1) && (
                      <Chip
                        size="small"
                        icon={<CheckCircle />}
                        label="Изображение загружено"
                        color="success"
                        variant="outlined"
                      />
                    )}
                    {completedSteps.has(2) && (
                      <Chip
                        size="small"
                        icon={<CheckCircle />}
                        label="Цена установлена"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Правая колонка - Форма */}
            <Grid item xs={12} md={8}>
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
                  minHeight: 500,
                }}
              >
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    {steps[activeStep].label}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {steps[activeStep].description}
                  </Typography>
                </Box>

                <Box
                  component="form"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                >
                  {renderStepContent(activeStep)}

                  {/* Навигационные кнопки */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mt: 4,
                      pt: 3,
                      borderTop: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                      variant="outlined"
                      size="large"
                      sx={{ minWidth: 120 }}
                    >
                      Назад
                    </Button>

                    <Box sx={{ display: "flex", gap: 2 }}>
                      {activeStep === steps.length - 1 ? (
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={
                            isPending ||
                            isUploadingImage ||
                            completedSteps.size < 3
                          }
                          sx={{
                            minWidth: 200,
                            py: 1.5,
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            "&:hover": {
                              background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                            },
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
                            "Создать товар"
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          variant="contained"
                          size="large"
                          sx={{ minWidth: 120 }}
                        >
                          Далее
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Slide>

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
