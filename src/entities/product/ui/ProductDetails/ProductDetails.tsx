"use client";

import React from "react";
import Link from "next/link";
import {
  Typography,
  Box,
  Stack,
  Container,
  Skeleton,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import StarsIcon from "@/shared/assets/icons/StarsIcon";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { AddToCartButton } from "@/features/cart/add-to-cart/ui/AddToCartButton";
import { ProductPrice } from "./ProductPrice";
import { ProductCharacteristics } from "./ProductCharacteristics";
import { ProductDescription } from "./ProductDescription";
import { MainImage } from "./MainImage";
import { AdditionalImages } from "./AdditionalImages";
import { useProductDetails } from "../../hooks/useProductDetails";

export const ProductDetails = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const isPending = false;
  const {
    productCard,
    handleAddToCart,
    mainImage,
    additionalImages,
    isInCart,
  } = useProductDetails();

  // Заглушка для характеристик
  const characteristics = [
    { label: "Материал", value: "Кожа" },
    { label: "Цвет", value: "Черный" },
    { label: "Размер", value: "42" },
    { label: "Вес", value: "1.2 кг" },
  ];

  if (isPending) {
    return (
      <Container maxWidth="md" sx={{ pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <Skeleton variant="text" width="80%" height={40} />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={60}
            sx={{ borderRadius: 2 }}
          />
          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 2 }}
            justifyContent="space-between"
          >
            <Skeleton
              variant="rectangular"
              width={140}
              height={60}
              sx={{ borderRadius: 2 }}
            />
            <Skeleton
              variant="rectangular"
              width={160}
              height={60}
              sx={{ borderRadius: 2 }}
            />
          </Stack>
          <Skeleton
            variant="rectangular"
            width="100%"
            height={200}
            sx={{ borderRadius: 2 }}
          />
        </Stack>
      </Container>
    );
  }

  return (
    <Box
      component="section"
      sx={{
        bgcolor: "background.default",
        pb: 10,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Typography
        component={"h1"}
        variant={"h4"}
        sx={{
          fontWeight: 700,
          mb: { xs: 1.5, sm: 2 },
          fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
          lineHeight: 1.2,
        }}
      >
        {productCard.name}
      </Typography>

      {/* Основное изображение */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: "16px", sm: "20px" },
          overflow: "hidden",
          mb: { xs: 1.5, sm: 2 },
        }}
      >
        <MainImage src={mainImage} />
      </Paper>

      {/* Дополнительные изображения */}
      {additionalImages.length > 0 && (
        <AdditionalImages images={additionalImages} />
      )}

      {/* Блок цены и рейтинга продавца */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent={"space-between"}
        spacing={{ xs: 1.5, sm: 0 }}
        mb={{ xs: 1.5, sm: 2 }}
      >
        <ProductPrice price={productCard.price} />
        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: "16px", sm: "20px" },
            p: { xs: "8px 16px", sm: "12px 16px" },
            height: "fit-content",
            alignSelf: { xs: "flex-start", sm: "center" },
          }}
        >
          <Link href={""} style={{ textDecoration: "none", color: "inherit" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <StarsIcon />
                <Typography
                  component={"span"}
                  fontWeight={600}
                  fontSize={{ xs: "16px", sm: "18px" }}
                >
                  4,8
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Продавец
              </Typography>
              <KeyboardArrowRightIcon
                fontSize={isMobile ? "small" : "medium"}
              />
            </Stack>
          </Link>
        </Paper>
      </Stack>

      {/* Характеристики и описание */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: "16px", sm: "20px" },
          mb: { xs: 1.5, sm: 2 },
          overflow: "hidden",
        }}
      >
        <Box p={{ xs: 1.5, sm: 2 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            gutterBottom
            sx={{ fontSize: { xs: "1rem", sm: "1.125rem" } }}
          >
            Характеристики и описание
          </Typography>
          <ProductCharacteristics characteristics={characteristics} />
          <ProductDescription description={productCard.description} />
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "20px",
          mb: 10,
        }}
      >
        <Box p={2}>
          <Typography variant="h6" fontWeight={"bold"}>
            Смотрите также
          </Typography>
        </Box>
      </Paper>
      {/* Фиксированная кнопка добавления в корзину */}
      <Paper
        elevation={2}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: 10,
          borderRadius: "20px 20px 0 0",
          p: { xs: "12px", sm: "16px" },
          boxShadow: "0px -2px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        <AddToCartButton
          onAddToCart={handleAddToCart}
          isInCart={isInCart ?? false}
        />
      </Paper>
    </Box>
  );
};
