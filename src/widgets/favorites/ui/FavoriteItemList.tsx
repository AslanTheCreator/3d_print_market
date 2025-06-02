"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import { useFavorites } from "@/entities/favorites/api/queries";
import { ProductCard } from "@/entities/product/ui/ProductCard";

const FavoritesSkeleton: React.FC = () => (
  <Grid container spacing={2}>
    {Array.from({ length: 8 }).map((_, index) => (
      <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
        <Card>
          <Skeleton variant="rectangular" height={200} />
          <CardContent>
            <Skeleton variant="text" height={24} />
            <Skeleton variant="text" height={20} width="60%" />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export const FavoriteItemList = () => {
  const { data: favorites = [], isLoading, error, refetch } = useFavorites();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: { xs: 2, sm: 4 },
            fontSize: { xs: "1.5rem", sm: "2rem" },
            fontWeight: 600,
          }}
        >
          Избранные товары
        </Typography>
        <FavoritesSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: { xs: 2, sm: 4 },
            fontSize: { xs: "1.5rem", sm: "2rem" },
            fontWeight: 600,
          }}
        >
          Избранные товары
        </Typography>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Повторить
            </Button>
          }
        >
          Произошла ошибка при загрузке избранных товаров
        </Alert>
      </Container>
    );
  }

  if (favorites.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: { xs: 2, sm: 4 },
            fontSize: { xs: "1.5rem", sm: "2rem" },
            fontWeight: 600,
          }}
        >
          Избранные товары
        </Typography>
        <Box
          sx={{
            textAlign: "center",
            py: { xs: 4, sm: 8 },
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            У вас пока нет избранных товаров
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Добавляйте товары в избранное, чтобы легко находить их позже
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: { xs: 2, sm: 4 },
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontSize: { xs: "1.5rem", sm: "2rem" },
            fontWeight: 600,
          }}
        >
          Избранные товары
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
        >
          {favorites.length}{" "}
          {favorites.length === 1
            ? "товар"
            : favorites.length < 5
            ? "товара"
            : "товаров"}
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 1, sm: 2 }}>
        {favorites.map((product, index) => (
          <Grid
            item
            xs={6}
            sm={4}
            md={3}
            lg={2.4}
            key={product.id}
            sx={{
              padding: isMobile ? "4px" : undefined,
            }}
          >
            <ProductCard {...product} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
