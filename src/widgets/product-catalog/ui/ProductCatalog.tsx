import React from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import {
  ProductCard,
  ProductCardModel,
  ProductCardSkeleton,
  ProductGrid,
  ProductGridItem,
} from "@/entities/product";
import { FavoriteButton } from "@/features/toggle-favorite";
import { AddToCartButton } from "@/features/cart";
import { useFavoritesChecks } from "@/entities/favorites/hooks";
import { ErrorState, EmptyCatalogState } from "@/shared/ui/states";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const { isProductInFavorites } = useFavoritesChecks();

  const getSkeletonCount = () => {
    if (isMobile) return 6;
    if (isTablet) return 8;
    return 12;
  };

  const handleCardClick = (productId: number) => {
    router.push(`/catalog/${productId}/detail`);
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
            <Box sx={{ position: "relative" }}>
              <ProductCard
                {...product}
                onCardClick={() => handleCardClick(product.id)}
                actions={
                  <AddToCartButton
                    productId={product.id}
                    availability={product.availability}
                    productName={product.name}
                    stockCount={product.count}
                  />
                }
              />
              <FavoriteButton
                productId={product.id}
                isFavorite={isProductInFavorites(product.id)}
                productName={product.name}
              />
            </Box>
          </ProductGridItem>
        ))}
      </ProductGrid>
    </Box>
  );
};
