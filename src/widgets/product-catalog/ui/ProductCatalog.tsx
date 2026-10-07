"use client";

import React from "react";
import { Alert, Box, Button } from "@mui/material";
import {
  ProductCard,
  ProductGrid,
  ProductGridSkeleton,
  ProductGridItem,
} from "@/entities/product";
import { useFavoritesChecks } from "@/entities/favorite";
import { Product } from "@/entities/product";
import { FavoriteButton } from "@/features/toggle-favorite";
import { AddToCartButton } from "@/features/add-to-cart";
import { ErrorState, EmptyCatalogState } from "@/shared/ui/states";
import { useRouter } from "next/navigation";
import { useAuth } from "@/entities/session";

interface ProductCatalogProps {
  products: Product[];
  leadingContent?: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
  skeletonCount?: number;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  leadingContent,
  isLoading,
  isError,
  onRetry,
  isRetrying,
  skeletonCount = 12,
}) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);

  const handleCardClick = (productId: number) => {
    router.push(`/catalog/${productId}/detail`);
  };

  if (isLoading && products.length === 0 && !isError) {
    return (
      <Box>
        <ProductGridSkeleton
          count={skeletonCount}
          leadingContent={leadingContent}
        />
      </Box>
    );
  }

  if (isError && products.length === 0) {
    return <ErrorState type="products" onRetry={onRetry} retryPending={isRetrying} />;
  }

  if (!products || products.length === 0) {
    if (leadingContent) {
      return (
        <Box>
          <ProductGrid>{leadingContent}</ProductGrid>
        </Box>
      );
    }

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
      <ProductGrid>
        {leadingContent}
        {products.map((product) => (
          <ProductGridItem key={product.id}>
            <Box sx={{ position: "relative" }}>
              <ProductCard
                {...product}
                onCardClick={() => handleCardClick(product.id)}
                actions={
                  <AddToCartButton
                    productId={product.id}
                    sellerId={product.sellerId}
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
      {isError && (
        <Alert severity="error" sx={{ mt: 2 }} action={onRetry && (
          <Button color="inherit" disabled={isRetrying} onClick={onRetry}>
            {isRetrying ? "Загрузка..." : "Повторить обновление"}
          </Button>
        )}>
          Не удалось обновить товары. Показаны ранее загруженные данные.
        </Alert>
      )}
    </Box>
  );
};
