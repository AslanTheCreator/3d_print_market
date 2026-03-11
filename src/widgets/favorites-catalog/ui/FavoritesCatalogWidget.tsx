"use client";

import { FavoriteBorderOutlined, SearchOutlined, StorefrontOutlined } from "@mui/icons-material";
import { Box, Container, Typography, alpha } from "@mui/material";
import { useRouter } from "next/navigation";
import { useFavoritesProducts } from "@/entities/favorite";
import { useAuth } from "@/features/auth";
import { EmptyPageState, UnauthorizedState } from "@/shared/ui/states";
import { ProductCatalog } from "@/widgets/product-catalog";

export const FavoritesCatalogWidget = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useFavoritesProducts(isAuthenticated);

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
          {"\u0418\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435"}
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
          title="\u0412 \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u043c \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u043e"
          description="\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u043f\u043e\u043d\u0440\u0430\u0432\u0438\u0432\u0448\u0438\u0435\u0441\u044f \u0442\u043e\u0432\u0430\u0440\u044b \u0432 \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435, \u0447\u0442\u043e\u0431\u044b \u043d\u0435 \u043f\u043e\u0442\u0435\u0440\u044f\u0442\u044c \u0438\u0445 \u0438 \u0432\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u043f\u043e\u043a\u0443\u043f\u043a\u0435 \u043f\u043e\u0437\u0436\u0435."
          actions={[
            {
              label: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433",
              icon: <StorefrontOutlined />,
              onClick: () => router.push("/"),
            },
            {
              label: "\u041d\u0430\u0439\u0442\u0438 \u0442\u043e\u0432\u0430\u0440",
              icon: <SearchOutlined />,
              onClick: () => router.push("/"),
              variant: "outlined" as const,
            },
          ]}
          tips={{
            title: "\u041a\u0430\u043a \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432 \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435?",
            items: [
              "\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u2661 \u043d\u0430 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0435 \u043b\u044e\u0431\u043e\u0433\u043e \u0442\u043e\u0432\u0430\u0440\u0430",
              "\u0418\u0437\u0431\u0440\u0430\u043d\u043d\u044b\u0435 \u0442\u043e\u0432\u0430\u0440\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0442\u0441\u044f \u0432 \u0432\u0430\u0448\u0435\u043c \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0435",
              "\u0412\u044b \u0441\u043c\u043e\u0436\u0435\u0442\u0435 \u0431\u044b\u0441\u0442\u0440\u043e \u0432\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u043d\u0438\u043c \u0432 \u043b\u044e\u0431\u043e\u0439 \u043c\u043e\u043c\u0435\u043d\u0442",
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
        {"\u0418\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435"}
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
};
