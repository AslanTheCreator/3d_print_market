import React from "react";
import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";
import { ProductCardModel } from "@/entities/product/model/types";
import { ProductCardSkeleton } from "@/entities/product";
import { ProductCardWithActions } from "./ProductCardWithActions";
import { EmptyCatalogState } from "@/shared/ui/states/EmptyCatalogState";
import { ErrorState } from "@/shared/ui";

interface ProductCatalogProps {
  products: ProductCardModel[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  isLoading,
  isError,
  onRetry,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const getSkeletonCount = () => {
    if (isMobile) return 6;
    if (isTablet) return 8;
    return 12;
  };

  if (isLoading) {
    return (
      <Box>
        <ProductGrid isMobile={isMobile}>
          {Array.from({ length: getSkeletonCount() }).map((_, index) => (
            <ProductGridItem key={index} isMobile={isMobile}>
              <ProductCardSkeleton />
            </ProductGridItem>
          ))}
        </ProductGrid>
      </Box>
    );
  }

  if (isError) {
    return <ErrorState type="products" onRetry={onRetry} />;
  }

  if (!products || products.length === 0) {
    return (
      <EmptyCatalogState
        type="empty"
        title="Товары не найдены"
        description="К сожалению, сейчас нет доступных предзаказов. Попробуйте вернуться позже или обновить страницу."
        actionLabel="Обновить"
        onAction={onRetry}
      />
    );
  }

  return (
    <Box>
      <ProductGrid isMobile={isMobile}>
        {products.map((product) => (
          <ProductGridItem key={product.id} isMobile={isMobile}>
            <ProductCardWithActions product={product} />
          </ProductGridItem>
        ))}
      </ProductGrid>
    </Box>
  );
};

// Вспомогательные компоненты для сетки
interface GridProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export const ProductGrid: React.FC<GridProps> = ({ children, isMobile }) => (
  <Grid
    container
    spacing={{ xs: 1, sm: 1.5, md: 2.5 }}
    sx={{
      margin: isMobile ? "-4px" : undefined,
      width: isMobile ? "calc(100% + 8px)" : "100%",
    }}
  >
    {children}
  </Grid>
);

interface GridItemProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export const ProductGridItem: React.FC<GridItemProps> = ({
  children,
  isMobile,
}) => (
  <Grid
    item
    xs={6}
    sm={3}
    md={3}
    lg={2}
    sx={{
      padding: isMobile ? "4px" : undefined,
    }}
  >
    {children}
  </Grid>
);
