import React from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import {
  ProductCardModel,
  ProductCardWithActions,
  ProductCardSkeleton,
} from "@/entities/product";
import { EmptyCatalogState } from "@/shared/ui/states/EmptyCatalogState";
import { ErrorState } from "@/shared/ui/states/ErrorState";
import { ProductGrid, ProductGridItem } from "./ProductGrid";

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
