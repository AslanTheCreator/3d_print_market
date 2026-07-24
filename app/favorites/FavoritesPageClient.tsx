"use client";

import { FavoriteBorderOutlined, SearchOutlined, StorefrontOutlined } from "@mui/icons-material";
import { Box, CircularProgress, Container, Typography, alpha } from "@mui/material";
import { useRouter } from "next/navigation";
import { useFavoritesProducts } from "@/entities/favorite";
import { useAuth } from "@/entities/session";
import { EmptyPageState, UnauthorizedState } from "@/shared/ui/states";
import { ProductCatalog } from "@/widgets/product-catalog";

export default function FavoritesPageClient() {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useFavoritesProducts(isInitialized && isAuthenticated);

  if (!isInitialized) {
    return (
      <Container sx={{ pt: "20px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress size={40} />
        </Box>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <UnauthorizedState type="favorites" />;
  }

  if (!isLoading && !isError && products.length === 0) {
    return (
      <Container sx={{ pt: "20px" }}>
        <Typography
          component="h1"
          variant="h2"
          sx={{
            mb: { xs: 2, sm: 3 },
            fontSize: { xs: "1.75rem", sm: "2rem" },
          }}
        >
          Избранное
        </Typography>

        <EmptyPageState
          icon={
            <FavoriteBorderOutlined
              sx={{
                fontSize: { xs: 48, sm: 56 },
                color: (t) => alpha(t.palette.primary.main, 0.6),
              }}
            />
          }
          title="В избранном пока пусто"
          description="Добавляйте понравившиеся товары в избранное, чтобы не потерять их и вернуться к покупке позже."
          actions={[
            {
              label: "Перейти в каталог",
              icon: <StorefrontOutlined />,
              onClick: () => router.push("/"),
            },
            {
              label: "Найти товар",
              icon: <SearchOutlined />,
              onClick: () => router.push("/"),
              variant: "outlined" as const,
            },
          ]}
          tips={{
            title: "Как добавить в избранное?",
            items: [
              "Нажмите ♡ на карточке любого товара",
              "Избранные товары сохранятся в вашем аккаунте",
              "Вы сможете быстро вернуться к ним в любой момент",
            ],
          }}
        />
      </Container>
    );
  }

  return (
    <Container sx={{ pt: "20px" }}>
      <Typography
        component="h1"
        variant="h2"
        sx={{
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: "1.75rem", sm: "2rem" },
        }}
      >
        Избранное
      </Typography>

      <Box>
        <ProductCatalog
          products={products}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
        />
      </Box>
    </Container>
  );
}
