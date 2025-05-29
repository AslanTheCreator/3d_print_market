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
  Grid,
} from "@mui/material";
import StarsIcon from "@/shared/assets/icons/StarsIcon";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { AddToCartButton } from "@/features/cart/add-to-cart/ui/AddToCartButton";
import { ProductPrice } from "./ProductPrice";
import { ProductDescription } from "./ProductDescription";
import { MainImage } from "./MainImage";
import { AdditionalImages } from "./AdditionalImages";
import { useProductDetails } from "../../hooks/useProductDetails";
import { useCardsInfinite } from "@/features/product";
import { InfiniteScroll } from "@/shared/ui";
import { ProductList } from "../ProductList";
import { ImageGallery } from "./ImageGallery";

export const ProductDetails = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const {
    productCard,
    handleAddToCart,
    mainImage,
    additionalImages,
    isInCart,
  } = useProductDetails();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useCardsInfinite(10, { categoryId: productCard.category?.id });

  const isPending = false;

  if (isPending) {
    return (
      <Container maxWidth="lg" sx={{ pt: { xs: 1, sm: 2, md: 3 } }}>
        <Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
          <Skeleton variant="text" width="80%" height={40} />
          <Grid container spacing={{ xs: 2, md: 4 }}>
            <Grid item xs={12} md={6}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={250}
                // height={{ xs: 250, sm: 300, md: 400 }}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Skeleton variant="rectangular" width="100%" height={60} />
                <Skeleton variant="rectangular" width="100%" height={80} />
                <Skeleton variant="rectangular" width="100%" height={120} />
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    );
  }

  // Мобильная версия (оригинальная)
  if (isMobile) {
    return (
      <Box
        component="section"
        sx={{
          bgcolor: "background.default",
          pb: 10,
        }}
      >
        <Typography
          component="h1"
          variant="h4"
          fontWeight={700}
          my={1.5}
          ml={1.5}
          sx={{
            fontSize: "1.5rem",
            lineHeight: 1.2,
          }}
        >
          {productCard.name}
        </Typography>

        <ImageGallery
          mainImage={mainImage}
          additionalImages={additionalImages}
        />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          mb={1.5}
        >
          <ProductPrice price={productCard.price} />
          <Paper
            elevation={0}
            sx={{
              borderRadius: "16px",
              p: "8px 16px",
              height: "fit-content",
            }}
          >
            <Link href="" style={{ textDecoration: "none", color: "inherit" }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <StarsIcon />
                  <Typography component="span" fontWeight={600} fontSize="16px">
                    4,8
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontSize="0.75rem"
                >
                  Продавец
                </Typography>
                <KeyboardArrowRightIcon fontSize="small" />
              </Stack>
            </Link>
          </Paper>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            borderRadius: "16px",
            mb: 1.5,
            overflow: "hidden",
          }}
        >
          <Box p={1.5}>
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              fontSize="1rem"
            >
              Описание
            </Typography>
            <ProductDescription description={productCard.description} />
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: "20px", mb: 10 }}>
          <Box p={2}>
            <Typography variant="h6" fontWeight="bold">
              Смотрите также
            </Typography>
            <Box pt="20px">
              <InfiniteScroll
                onLoadMore={fetchNextPage}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              >
                <ProductList
                  products={data?.pages.flat() ?? []}
                  isLoading={isLoading}
                />
              </InfiniteScroll>
            </Box>
          </Box>
        </Paper>

        <Paper
          elevation={2}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            zIndex: 10,
            borderRadius: "20px 20px 0 0",
            p: "12px",
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
  }

  // Планшетная и десктопная версии
  return (
    <Container
      maxWidth="lg"
      sx={{
        bgcolor: "background.default",
        pt: { xs: 2, sm: 3, md: 4 },
        pb: { xs: 4, sm: 6, md: 8 },
      }}
    >
      {/* Заголовок */}
      <Typography
        component="h1"
        variant="h3"
        fontWeight={700}
        mb={{ xs: 2, sm: 3, md: 4 }}
        sx={{
          fontSize: { sm: "1.75rem", md: "2.25rem", lg: "2.5rem" },
          lineHeight: 1.2,
        }}
      >
        {productCard.name}
      </Typography>

      {/* Основной контент */}
      <Grid container spacing={{ xs: 2, sm: 3, md: 4, lg: 6 }}>
        {/* Левая колонка - Изображения */}
        <Grid item xs={12} md={6} lg={7}>
          <Box sx={{ position: "sticky", top: 20 }}>
            <ImageGallery
              mainImage={mainImage}
              additionalImages={additionalImages}
            />
          </Box>
        </Grid>

        {/* Правая колонка - Информация о товаре */}
        <Grid item xs={12} md={6} lg={5}>
          <Stack spacing={{ xs: 2, sm: 3 }}>
            {/* Блок цены и рейтинга */}
            <Stack spacing={2}>
              <ProductPrice price={productCard.price} />

              <Paper
                elevation={0}
                sx={{
                  borderRadius: "20px",
                  p: { xs: "12px 16px", sm: "16px 20px" },
                  width: "fit-content",
                }}
              >
                <Link
                  href=""
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <StarsIcon />
                      <Typography
                        component="span"
                        fontWeight={600}
                        fontSize={{ xs: "16px", sm: "18px" }}
                      >
                        4,8
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                    >
                      Продавец
                    </Typography>
                    <KeyboardArrowRightIcon fontSize="medium" />
                  </Stack>
                </Link>
              </Paper>
            </Stack>

            {/* Кнопка добавления в корзину */}
            <Box sx={{ pt: { xs: 1, sm: 2 } }}>
              <AddToCartButton
                onAddToCart={handleAddToCart}
                isInCart={isInCart ?? false}
              />
            </Box>

            {/* Описание */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: "20px",
                overflow: "hidden",
              }}
            >
              <Box p={{ xs: 2, sm: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }}
                >
                  Описание
                </Typography>
                <ProductDescription description={productCard.description} />
              </Box>
            </Paper>

            {/* Дополнительная информация для десктопа */}
            {isDesktop && (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "20px",
                  overflow: "hidden",
                }}
              >
                <Box p={3}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Характеристики
                  </Typography>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Категория
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {productCard.category?.name || "Не указана"}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Артикул
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {productCard.id}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Блок "Смотрите также" */}
      <Box sx={{ mt: { xs: 4, sm: 6, md: 8 } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          <Box p={{ xs: 2, sm: 3 }}>
            <Typography
              variant="h5"
              fontWeight="bold"
              mb={{ xs: 2, sm: 3 }}
              sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
            >
              Смотрите также
            </Typography>
            <InfiniteScroll
              onLoadMore={fetchNextPage}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            >
              <ProductList
                products={data?.pages.flat() ?? []}
                isLoading={isLoading}
              />
            </InfiniteScroll>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
